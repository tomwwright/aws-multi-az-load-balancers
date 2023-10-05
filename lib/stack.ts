import * as cdk from "aws-cdk-lib";
import { Cluster } from "aws-cdk-lib/aws-ecs";
import { ApplicationLoadBalancer, ApplicationProtocol } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { TestingFargateService } from "./service";
import { AclCidr, AclTraffic, Action, IVpc, NetworkAcl, SecurityGroup, SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";

interface LoadBalancerStackProps extends cdk.StackProps {
  disableCrossZoneConnectivity: boolean,
}

export class LoadBalancerStack extends cdk.Stack {
  constructor(app: cdk.App, id: string, props: LoadBalancerStackProps) {
    super(app, id, props);

    const vpc = new Vpc(this, "Vpc", {
      natGateways: 0, // NATs have an hourly cost
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: SubnetType.PUBLIC,
        },
      ],
      maxAzs: 2,
    })

    if (props.disableCrossZoneConnectivity) {
      this.disableCrossZoneConnectivity(vpc)
    }


    const cluster = new Cluster(this, "Cluster", {
      clusterName: id,
      vpc
    });

    const securityGroup = new SecurityGroup(this, "SecurityGroup", {
      vpc,
    });


    const loadBalancer = new ApplicationLoadBalancer(this, "LoadBalancer", {
      vpc,
      securityGroup,
      loadBalancerName: id,
      internetFacing: true,
    });

    const service = new TestingFargateService(this, "Service", {
      cluster,
      securityGroup,
    })

    loadBalancer.addListener("Listener", {
      protocol: ApplicationProtocol.HTTP,
      defaultTargetGroups: [service.targetGroup]
    })
  }

  private disableCrossZoneConnectivity(vpc: IVpc) {
    const blockAtoB = new NetworkAcl(this, "BlockCrossZoneAtoB", {
      networkAclName: "BlockAtoB",
      vpc,
    })
    blockAtoB.addEntry("BlockAToB", {
      ruleNumber: 100,
      direction: TrafficDirection.EGRESS,
      cidr: AclCidr.ipv4(vpc.publicSubnets[1].ipv4CidrBlock),
      traffic: AclTraffic.allTraffic(),
      ruleAction: Action.DENY,
    })
    blockAtoB.addEntry("AllowAllEgress", {
      ruleNumber: 999,
      direction: TrafficDirection.EGRESS,
      cidr: AclCidr.anyIpv4(),
      traffic: AclTraffic.allTraffic(),
      ruleAction: Action.ALLOW,
    })
    blockAtoB.addEntry("AllowAllIngress", {
      ruleNumber: 999,
      direction: TrafficDirection.INGRESS,
      cidr: AclCidr.anyIpv4(),
      traffic: AclTraffic.allTraffic(),
      ruleAction: Action.ALLOW,
    })
    vpc.publicSubnets[0].associateNetworkAcl("BlockCrossZoneAtoB", blockAtoB)

    const blockBtoA = new NetworkAcl(this, "BlockCrossZoneBtoA", {
      networkAclName: "BlockBtoA",
      vpc,
    })
    blockBtoA.addEntry("BlockBtoA", {
      ruleNumber: 100,
      direction: TrafficDirection.EGRESS,
      cidr: AclCidr.ipv4(vpc.publicSubnets[0].ipv4CidrBlock),
      traffic: AclTraffic.allTraffic(),
      ruleAction: Action.DENY,
    })
    blockBtoA.addEntry("AllowAllEgress", {
      ruleNumber: 999,
      direction: TrafficDirection.EGRESS,
      cidr: AclCidr.anyIpv4(),
      traffic: AclTraffic.allTraffic(),
      ruleAction: Action.ALLOW,
    })
    blockBtoA.addEntry("AllowAllIngress", {
      ruleNumber: 999,
      direction: TrafficDirection.INGRESS,
      cidr: AclCidr.anyIpv4(),
      traffic: AclTraffic.allTraffic(),
      ruleAction: Action.ALLOW,
    })
    vpc.publicSubnets[1].associateNetworkAcl("BlockCrossZoneBtoA", blockBtoA)
  }
}
