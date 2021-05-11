import ecs = require('@aws-cdk/aws-ecs');
import cdk = require('@aws-cdk/core');
import { Role, ServicePrincipal, PolicyStatement, Effect } from '@aws-cdk/aws-iam';
import * as secretsmanager from '@aws-cdk/aws-secretsmanager';


class FargateServiceNLB extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    //2. Creation of Execution Role for our task
    const execRole = new Role(this, 'search-api-exec-role', {
      roleName: 'social-api-role', assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com')
    })
    //3. Adding permissions to the above created role...basically giving permissions to ECR image and Cloudwatch logs
    execRole.addToPolicy(new PolicyStatement({
      actions: [
        "*"
      ], effect: Effect.ALLOW, resources: ["*"]
    }));
    
    //5. Create a task definition for our cluster to invoke a task
    const taskDef = new ecs.FargateTaskDefinition(this, "task-wise-dev-ap-spring-master", {
      family: 'task-wise-dev-ap-spring-master',
      memoryLimitMiB: 512,
      cpu: 256,
      executionRole: execRole,
      taskRole: execRole
    });
    
    const mySecretArn = cdk.Stack.of(this).formatArn({
      service: 'secretsmanager',
      resource: 'secret',
      resourceName: "ARN/MySecret",
      sep: ':',
    });
    const mySecret = secretsmanager.Secret.fromSecretArn(this, 'mysecret', mySecretArn);
    const mySecretEnv = ecs.Secret.fromSecretsManager(mySecret);

    //7. Create container for the task definition from ECR image
    taskDef.addContainer("container-wise-dev-ap-spring-master-spr", {
      image: ecs.ContainerImage.fromRegistry("nginx"),
      essential: true,
      environment: {
        "MYSQL_HOST": "ARN:host::",
        "MYSQL_PORT": "ARN:port::",
        "MYSQL_USER": "ARN:username::",
        "MYSQL_PASSWORD": "ARN:password::",
        "MYSQL_DATABASE": "ARN:dbname::",
        "REDIS_HOST": "ARN"
      },
      secrets: {
        // Assign a JSON value from the secret to a environment variable
        MY_SECRET: mySecretEnv,

      }
    }).addPortMappings({containerPort: 80}); //8. Add port mappings to your container...Make sure you use TCP protocol for Network Load Balancer (NLB)
    
    taskDef.addContainer("container-wise-dev-ap-spring-master-log", {
      image: ecs.ContainerImage.fromRegistry("log"),
      essential: false
    })
    
    taskDef.addContainer("container-wise-dev-ap-spring-master-xray", {
      image: ecs.ContainerImage.fromRegistry("xray"),
      essential: false
    })

    

//     //13. Create Fargate Service from cluster, task definition and the security group
//     const fargateService = new ecs.FargateService(this, 'search-api-fg-service', {
//       cluster,
//       taskDefinition: taskDef, 
//       assignPublicIp: true, 
//       serviceName: "search-api-svc",
//       securityGroup:secGroup
//     });

//     //14. Add fargate service to the listener 
//     listener.addTargets('search-api-tg', {
//       targetGroupName: 'search-api-tg',
//       port: 80,
//       targets: [fargateService],
//       deregistrationDelay: cdk.Duration.seconds(300)
//     });

//     new cdk.CfnOutput(this, 'ClusterARN: ', { value: cluster.clusterArn });
  }
}

const app = new cdk.App();

new FargateServiceNLB(app, 'wise-demo');

app.synth();
