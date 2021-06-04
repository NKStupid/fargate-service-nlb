import ecs = require('@aws-cdk/aws-ecs');
import cdk = require('@aws-cdk/core');
// import { Role, ServicePrincipal, PolicyStatement, Effect } from '@aws-cdk/aws-iam';
import * as iam from '@aws-cdk/aws-iam';
import * as secretsmanager from '@aws-cdk/aws-secretsmanager';
import ec2 = require('@aws-cdk/aws-ec2');

interface MultistackProps extends cdk.StackProps {
  microservice?: boolean;
}

class FargateServiceNLB extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    var master = props && props.microservice;
    var taskName = "task-wise-dev-ap-spring-master";
    
    //1. VPC
    const vpc = ec2.Vpc.fromLookup(this, 'ImportVPC',{isDefault: false,vpcId: "vpc-097fedf3787889d3a" });
    //2. IAM role
    const execRole = iam.Role.fromRoleArn(this, 'Role', 'arn:aws:iam::278772998776:role/ecs-task-test');
    //3. securityGroup
    const securityGroup = ec2.SecurityGroup.fromSecurityGroupId(this, 'securitygroup', 'sg-03d8d9334085f039a');
    //4. Create the ECS fargate cluster
    const cluster = new ecs.Cluster(this, 'cluster-wise-dev-ap', { vpc, clusterName: "cluster-wise-dev-ap" });
                                              
    //5. Create a task definition for our cluster to invoke a task
    const taskDef = new ecs.FargateTaskDefinition(this, taskName, {
      family: 'task-wise-dev-ap-spring-master',
      memoryLimitMiB: 512,
      cpu: 256,
      executionRole: execRole,
      taskRole: execRole
    });
    
    const mySecretArn = cdk.Stack.of(this).formatArn({
      service: 'secretsmanager',
      resource: 'secret',
      resourceName: "dev/appBeta/Mysql:password::",
      sep: ':',
    });
    const mySecret = secretsmanager.Secret.fromSecretArn(this, 'mysecret', mySecretArn);
    const mySecretEnv = ecs.Secret.fromSecretsManager(mySecret);

    //7. Create container for the task definition from ECR image
    taskDef.addContainer("container-wise-dev-ap-spring-master-spr", {
      image: ecs.ContainerImage.fromRegistry("amazon/amazon-ecs-sample"),
      essential: true,
//       environment: {
//         "MYSQL_HOST": "ARN:host::",
//         "MYSQL_PORT": "ARN:port::",
//         "MYSQL_USER": "ARN:username::",
//         "MYSQL_PASSWORD": "ARN:password::",
//         "MYSQL_DATABASE": "ARN:dbname::",
//         "REDIS_HOST": "ARN"
//       },
      secrets: {
        // Assign a JSON value from the secret to a environment variable
        MYSQL_PASSWORD: mySecretEnv,

      }
    }).addPortMappings({containerPort: 80}); //8. Add port mappings to your container...Make sure you use TCP protocol for Network Load Balancer (NLB)
    
    taskDef.addContainer("container-wise-dev-ap-spring-master-log", {
      image: ecs.ContainerImage.fromRegistry("hello-world"),
      essential: false
    })
    
    taskDef.addContainer("container-wise-dev-ap-spring-master-xray", {
      image: ecs.ContainerImage.fromRegistry("hello-world"),
      essential: false
    })


    //13. Create Fargate Service from cluster, task definition and the security group
    new ecs.FargateService(this, 'service-wise-dev-ap-spring-master', {
      cluster,
      taskDefinition: taskDef, 
      assignPublicIp: true, 
      serviceName: "service-wise-dev-ap-spring-master",
      securityGroup:securityGroup,
      desiredCount: 0
    });

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

// for development, use account/region from cdk cli
const devEnv = {
  account: "278772998776",
  region: "us-east-1",
};


const app = new cdk.App();

new FargateServiceNLB(app, 'wise-demo', { env: devEnv,  microservice: "master"},);

app.synth();
