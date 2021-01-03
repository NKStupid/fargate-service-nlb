import ecs = require('@aws-cdk/aws-ecs');
import ec2 = require('@aws-cdk/aws-ec2');
import cdk = require('@aws-cdk/core');
import { NetworkLoadBalancer } from '@aws-cdk/aws-elasticloadbalancingv2';
import { Role, ServicePrincipal, PolicyStatement, Effect } from '@aws-cdk/aws-iam';
import { LogGroup } from '@aws-cdk/aws-logs';
import { SecurityGroup } from '@aws-cdk/aws-ec2';
class FargateServiceNLB extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    //1. Create VPC
    var vpc;
    vpc = new ec2.Vpc(this, 'Vpc', { maxAzs: 2 });
    
    //2. Creation of Execution Role for our task
    const execRole = new Role(this, 'wise-demo-ecs-tasks-role', {
      roleName: 'wise-demo-ecs-tasks-role', assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com')
    })
    //3. Adding permissions to the above created role...basically giving permissions to ECR image and Cloudwatch logs
    execRole.addToPolicy(new PolicyStatement({
      actions: [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ], effect: Effect.ALLOW, resources: ["*"]
    }));

    //4. Create the ECS fargate cluster
    const cluster = new ecs.Cluster(this, 'wise-demo-cluster', { vpc, clusterName: "wise-demo-cluster" });

    //5. Create a task definition for our cluster to invoke a task
    const taskDef = new ecs.FargateTaskDefinition(this, "wise-demo-task", {
      family: 'wise-demo-task',
      memoryLimitMiB: 512,
      cpu: 256,
      executionRole: execRole,
      taskRole: execRole
    });

    //6. Create log group for our task to put logs
    const lg = LogGroup.fromLogGroupName(this, 'wise-demo-log-group',  '/ecs/wise-demo-task');
    const log = new ecs.AwsLogDriver({
      logGroup : lg? lg : new LogGroup(this, 'wise-demo-log-group',{logGroupName:'/ecs/wise-demo-task'
      }),
      streamPrefix : 'ecs'
    })

    //7. Create container for the task definition from ECR image
    var container = taskDef.addContainer("wise-demo-container", {
      image: ecs.ContainerImage.fromRegistry("526913279474.dkr.ecr.us-east-1.amazonaws.com/ecr-simplehttp:latest"),
      logging:log
    })

    //8. Add port mappings to your container...Make sure you use TCP protocol for Network Load Balancer (NLB)
    container.addPortMappings({
      containerPort: 8000,
      hostPort: 8000,
      protocol: ecs.Protocol.TCP
    });

    //9. Create the NLB using the above VPC.
    const lb = new NetworkLoadBalancer(this, 'wise-demo-nlb', {
      loadBalancerName: 'wise-demo-nlb',
      vpc,
      internetFacing: false
    });

    //10. Add a listener on a particular port for the NLB
    const listener = lb.addListener('wise-demo-listener', {
      port: 8000,
    });

    //11. Create your own security Group using VPC
    const secGroup = new SecurityGroup(this, 'wise-demo-sg', {
      securityGroupName: "wise-demo-sg",
      vpc:vpc,
      allowAllOutbound:true
    });

    //12. Add IngressRule to access the docker image on 80 and 8000 ports 
    secGroup.addIngressRule(ec2.Peer.ipv4('0.0.0.0/0'), ec2.Port.tcp(80), 'SSH frm anywhere');
    secGroup.addIngressRule(ec2.Peer.ipv4('0.0.0.0/0'), ec2.Port.tcp(8000), '');

    //13. Create Fargate Service from cluster, task definition and the security group
    const fargateService = new ecs.FargateService(this, 'wise-demo-fg-service', {
      cluster,
      taskDefinition: taskDef, 
      assignPublicIp: true, 
      serviceName: "wise-demo-svc",
      securityGroup:secGroup
    });

    //14. Add fargate service to the listener 
    listener.addTargets('wise-demo-tg', {
      targetGroupName: 'wise-demo-tg',
      port: 8000,
      targets: [fargateService],
      deregistrationDelay: cdk.Duration.seconds(300)
    });

    new cdk.CfnOutput(this, 'ClusterARN: ', { value: cluster.clusterArn });
  }
}

const app = new cdk.App();

new FargateServiceNLB(app, 'wise-demo-fargate-nlb');

app.synth();
