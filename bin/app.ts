#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { LoadBalancerStack } from "../lib/stack";

const app = new cdk.App();
new LoadBalancerStack(app, 'testing-multi-az', {
  disableCrossZoneConnectivity: false,
  disableCrossZoneLoadBalancing: false,
  runningTaskCount: 2
})