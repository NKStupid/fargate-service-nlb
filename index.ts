import ecs = require('@aws-cdk/aws-ecs');
import ec2 = require('@aws-cdk/aws-ec2');
import cdk = require('@aws-cdk/core');
import { NetworkLoadBalancer } from '@aws-cdk/aws-elasticloadbalancingv2';
import { Role, ServicePrincipal, PolicyStatement, Effect } from '@aws-cdk/aws-iam';
// import { LogGroup } from '@aws-cdk/aws-logs';
import { SecurityGroup } from '@aws-cdk/aws-ec2';
// import ecs_patterns = require('@aws-cdk/aws-ecs-patterns');


class FargateServiceNLB extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    //1. Create VPC
    var vpc;
    vpc = ec2.Vpc.fromLookup(this, 'Vpc', { vpcId: 'vpc-014132662ab2fe33c' })
//     vpc = new ec2.Vpc(this, 'Vpc', { maxAzs: 2 });
    
    
    //2. Creation of Execution Role for our task
    const execRole = new Role(this, 'wise-proto-exec-role', {
      roleName: 'wise-proto-role', assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com')
    })
    //3. Adding permissions to the above created role...basically giving permissions to ECR image and Cloudwatch logs
    execRole.addToPolicy(new PolicyStatement({
      actions: [
        "*"
      ], effect: Effect.ALLOW, resources: ["*"]
    }));

    //4. Create the ECS fargate cluster
    const cluster = new ecs.Cluster(this, 'wise-proto-cluster', { vpc, clusterName: "wise-proto-cluster" });

    //5. Create a task definition for our cluster to invoke a task
    const taskDefBack = new ecs.FargateTaskDefinition(this, "wise-proto-back-task", {
      family: 'wise-proto-back-task',
      memoryLimitMiB: 512,
      cpu: 256,
      executionRole: execRole,
      taskRole: execRole
    });

    //6. Create log group for our task to put logs
//     const lg = LogGroup.fromLogGroupName(this, 'search-api-log-group',  '/ecs/search-api-task');
//     const log = new ecs.AwsLogDriver({
//       logGroup : lg? lg : new LogGroup(this, 'search-api-log-group',{logGroupName:'/ecs/search-api-task'
//       }),
//       streamPrefix : 'ecs'
//     })

    //7. Create container for the task definition from ECR image
    var containerBack = taskDefBack.addContainer("wise-proto-back-container", {
      image: ecs.ContainerImage.fromRegistry("suizhidaidev/web-test"),
//       logging:log
    })

    //8. Add port mappings to your container...Make sure you use TCP protocol for Network Load Balancer (NLB)
    containerBack.addPortMappings({
      containerPort: 8000,
      hostPort: 8000,
      protocol: ecs.Protocol.TCP
    });

    //9. Create the NLB using the above VPC.
    const lbBack = new NetworkLoadBalancer(this, 'wise-proto-back-nlb', {
      loadBalancerName: 'wise-proto-back-nlb',
      vpc,
      internetFacing: true
    });

    //10. Add a listener on a particular port for the NLB
    const listenerBack = lbBack.addListener('wise-proto-back-listener', {
      port: 80,
    });

    //11. Create your own security Group using VPC
    const secGroup = new SecurityGroup(this, 'wise-proto-sg', {
      securityGroupName: "wise-proto-sg",
      vpc:vpc,
      allowAllOutbound:true
    });

    //12. Add IngressRule to access the docker image on 80 and 7070 ports 
    secGroup.addIngressRule(ec2.Peer.ipv4('0.0.0.0/0'), ec2.Port.tcp(80), 'SSH frm anywhere');
    secGroup.addIngressRule(ec2.Peer.ipv4('0.0.0.0/0'), ec2.Port.tcp(8000), 'Container exposed 8000 port');
    secGroup.addIngressRule(ec2.Peer.ipv4('0.0.0.0/0'), ec2.Port.tcp(8080), 'Container exposed 8080 port');

    //13. Create Fargate Service from cluster, task definition and the security group
    const fargateServiceBack = new ecs.FargateService(this, 'wise-proto-back-fg-service', {
      cluster,
      taskDefinition: taskDefBack, 
      assignPublicIp: true, 
      serviceName: "wise-proto-back-svc",
      securityGroup:secGroup
    });

    //14. Add fargate service to the listener 
    listenerBack.addTargets('wise-proto-back-tg', {
      targetGroupName: 'wise-proto-back-tg',
      port: 8000,
      targets: [fargateServiceBack],
      deregistrationDelay: cdk.Duration.seconds(300)
    });
    
//     // 15. Create Frontend Service
//     // Instantiate Fargate Service with just cluster and image
//     new ecs_patterns.ApplicationLoadBalancedFargateService(this, "FargateService", {
//       cluster,
//       taskImageOptions: {
//         image: ecs.ContainerImage.fromRegistry("amazon/amazon-ecs-sample"),
//       },
//     });
    
    
    //16. (Frontend) --- Create a task definition for our cluster to invoke a task
    const taskDefFront = new ecs.FargateTaskDefinition(this, "wise-proto-front-task", {
      family: 'wise-proto-front-task',
      memoryLimitMiB: 512,
      cpu: 256,
      executionRole: execRole,
      taskRole: execRole
    });
    
     //17. (Frontend) --- Create container for the task definition from ECR image
    var containerFront = taskDefFront.addContainer("wise-proto-front-container", {
      image: ecs.ContainerImage.fromRegistry("suizhidaidev/web-front"),
    })

    //18. (Frontend) --- Add port mappings to your container...Make sure you use TCP protocol for Network Load Balancer (NLB)
    containerFront.addPortMappings({
      containerPort: 8080,
      hostPort: 8080,
      protocol: ecs.Protocol.TCP
    });

    //19. (Frontend) --- Create the NLB using the above VPC.
    const lbFront = new NetworkLoadBalancer(this, 'wise-proto-front-nlb', {
      loadBalancerName: 'wise-proto-front-nlb',
      vpc,
      internetFacing: true
    });

    //20. (Frontend) --- Add a listener on a particular port for the NLB
    const listenerFront = lbFront.addListener('wise-proto-front-listener', {
      port: 80,
    });    
    
    //21. (Frontend) --- Create Fargate Service from cluster, task definition and the security group
    const fargateServiceFront = new ecs.FargateService(this, 'wise-proto-front-fg-service', {
      cluster,
      taskDefinition: taskDefFront, 
      assignPublicIp: true, 
      serviceName: "wise-proto-front-svc",
      securityGroup:secGroup
    });

    //22. (Frontend) --- Add fargate service to the listener 
    listenerFront.addTargets('wise-proto-front-tg', {
      targetGroupName: 'wise-proto-front-tg',
      port: 8080,
      targets: [fargateServiceFront],
      deregistrationDelay: cdk.Duration.seconds(300)
    });
    
    new cdk.CfnOutput(this, 'ClusterARN: ', { value: cluster.clusterArn });
    new cdk.CfnOutput(this, 'fargateServiceBack-serviceName: ', { value: fargateServiceBack.serviceName });
    new cdk.CfnOutput(this, 'fargateServiceFront-serviceName: ', { value: fargateServiceFront.serviceName });

  }
}

const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new cdk.App();

new FargateServiceNLB(app, 'wise-proto', { env: devEnv });

app.synth();
