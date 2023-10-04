import { Duration } from "aws-cdk-lib";
import { ISecurityGroup } from "aws-cdk-lib/aws-ec2";
import { Platform } from "aws-cdk-lib/aws-ecr-assets";
import {
  ContainerImage,
  CpuArchitecture,
  FargateService,
  FargateTaskDefinition,
  ICluster,
  LinuxParameters,
} from "aws-cdk-lib/aws-ecs";
import {
  ApplicationProtocol,
  ApplicationTargetGroup,
} from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { Construct } from "constructs";

type FargateServiceProps = {
  cluster: ICluster;
  securityGroup: ISecurityGroup;
};

export class TestingFargateService extends Construct {
  public readonly targetGroup: ApplicationTargetGroup;
  constructor(scope: Construct, id: string, props: FargateServiceProps) {
    super(scope, id);

    const {
      cluster,
      securityGroup,
    } = props;

    const taskDefinition = new FargateTaskDefinition(this, "TaskDefinition", {
      runtimePlatform: {
        cpuArchitecture: CpuArchitecture.ARM64
      },
    });
    taskDefinition.addContainer("expressjs", {
      image: ContainerImage.fromAsset("docker", {
        platform: Platform.LINUX_ARM64
      }),
      portMappings: [
        {
          containerPort: 3000,
        },
      ],
      healthCheck: {
        command: ["CMD-SHELL", "curl -f http://localhost:3000/ || exit 1"],
        interval: Duration.seconds(5),
        timeout: Duration.seconds(2),
      },
      linuxParameters: new LinuxParameters(this, "LinuxParameters", {
        initProcessEnabled: true,
      }),
    });

    const service = new FargateService(this, "Service", {
      cluster,
      taskDefinition,
      serviceName: id,
      securityGroups: [securityGroup],
      minHealthyPercent: 0,
      maxHealthyPercent: 200,
      assignPublicIp: true
    });

    this.targetGroup = new ApplicationTargetGroup(this, "TargetGroup", {
      targets: [service],
      port: 3000,
      protocol: ApplicationProtocol.HTTP,
      vpc: cluster.vpc,
      deregistrationDelay: Duration.seconds(0),
      healthCheck: {
        healthyThresholdCount: 2,
        timeout: Duration.seconds(2),
        interval: Duration.seconds(5),
      },
    });
  }
}
