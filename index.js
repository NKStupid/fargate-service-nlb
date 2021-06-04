"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ecs = require("@aws-cdk/aws-ecs");
const cdk = require("@aws-cdk/core");
// import { Role, ServicePrincipal, PolicyStatement, Effect } from '@aws-cdk/aws-iam';
const iam = require("@aws-cdk/aws-iam");
const secretsmanager = require("@aws-cdk/aws-secretsmanager");
const ec2 = require("@aws-cdk/aws-ec2");
class FargateServiceNLB extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        var master = props && props.microservice;
        var taskName = "task-wise-dev-ap-spring-" + master;
        var serviceName = "service-wise-dev-ap-spring-" + master;
        var mainImageURL = "amazon/amazon-ecs-sample";
        var sidecarLogURL = "hello-world";
        var sidecarXRayURL = "hello-world";
        var mainContainerName = "container-wise-dev-ap-spring-" + master + "-spr";
        var sidecarLogName = "container-wise-dev-ap-spring-" + master + "-log";
        var sidecarXRayName = "container-wise-dev-ap-spring-" + master + "-xray";
        //1. VPC
        const vpc = ec2.Vpc.fromLookup(this, 'ImportVPC', { isDefault: false, vpcId: "vpc-097fedf3787889d3a" });
        //2. IAM role
        const execRole = iam.Role.fromRoleArn(this, 'Role', 'arn:aws:iam::278772998776:role/ecs-task-test');
        //3. securityGroup
        const securityGroup = ec2.SecurityGroup.fromSecurityGroupId(this, 'securitygroup', 'sg-03d8d9334085f039a');
        //4. Create the ECS fargate cluster
        const cluster = new ecs.Cluster(this, 'cluster-wise-dev-ap', { vpc, clusterName: "cluster-wise-dev-ap" });
        //5. Create a task definition for our cluster to invoke a task
        const taskDef = new ecs.FargateTaskDefinition(this, taskName, {
            family: taskName,
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
        taskDef.addContainer(mainContainerName, {
            image: ecs.ContainerImage.fromRegistry(mainImageURL),
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
        }).addPortMappings({ containerPort: 80 }); //8. Add port mappings to your container...Make sure you use TCP protocol for Network Load Balancer (NLB)
        taskDef.addContainer(sidecarLogName, {
            image: ecs.ContainerImage.fromRegistry(sidecarLogURL),
            essential: false
        });
        taskDef.addContainer(sidecarXRayName, {
            image: ecs.ContainerImage.fromRegistry(sidecarXRayURL),
            essential: false
        });
        //13. Create Fargate Service from cluster, task definition and the security group
        new ecs.FargateService(this, serviceName, {
            cluster,
            taskDefinition: taskDef,
            assignPublicIp: true,
            serviceName: serviceName,
            securityGroup: securityGroup,
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
new FargateServiceNLB(app, 'wise-demo', { env: devEnv, microservice: "master" });
new FargateServiceNLB(app, 'wise-demo', { env: devEnv, microservice: "workflow" });
new FargateServiceNLB(app, 'wise-demo', { env: devEnv, microservice: "notification" });
new FargateServiceNLB(app, 'wise-demo', { env: devEnv, microservice: "gateway" });
app.synth();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLHdDQUF5QztBQUN6QyxxQ0FBc0M7QUFDdEMsc0ZBQXNGO0FBQ3RGLHdDQUF3QztBQUN4Qyw4REFBOEQ7QUFDOUQsd0NBQXlDO0FBTXpDLE1BQU0saUJBQWtCLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDdkMsWUFBWSxLQUFjLEVBQUUsRUFBVSxFQUFFLEtBQXVCO1FBQzdELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLElBQUksTUFBTSxHQUFHLEtBQUssSUFBSSxLQUFLLENBQUMsWUFBWSxDQUFDO1FBQ3pDLElBQUksUUFBUSxHQUFHLDBCQUEwQixHQUFHLE1BQU0sQ0FBQztRQUNuRCxJQUFJLFdBQVcsR0FBRyw2QkFBNkIsR0FBRyxNQUFNLENBQUM7UUFFekQsSUFBSSxZQUFZLEdBQUcsMEJBQTBCLENBQUM7UUFDOUMsSUFBSSxhQUFhLEdBQUcsYUFBYSxDQUFDO1FBQ2xDLElBQUksY0FBYyxHQUFHLGFBQWEsQ0FBQztRQUNuQyxJQUFJLGlCQUFpQixHQUFHLCtCQUErQixHQUFHLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFDMUUsSUFBSSxjQUFjLEdBQUcsK0JBQStCLEdBQUcsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUN2RSxJQUFJLGVBQWUsR0FBRywrQkFBK0IsR0FBRyxNQUFNLEdBQUcsT0FBTyxDQUFDO1FBR3pFLFFBQVE7UUFDUixNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsV0FBVyxFQUFDLEVBQUMsU0FBUyxFQUFFLEtBQUssRUFBQyxLQUFLLEVBQUUsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDO1FBQ3JHLGFBQWE7UUFDYixNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUs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QUFHRixNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUUxQixJQUFJLGlCQUFpQixDQUFDLEdBQUcsRUFBRSxXQUFXLEVBQUUsRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFHLFlBQVksRUFBRSxRQUFRLEVBQUMsQ0FBRSxDQUFDO0FBQ2xGLElBQUksaUJBQWlCLENBQUMsR0FBRyxFQUFFLFdBQVcsRUFBRSxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUcsWUFBWSxFQUFFLFVBQVUsRUFBQyxDQUFFLENBQUM7QUFDcEYsSUFBSSxpQkFBaUIsQ0FBQyxHQUFHLEVBQUUsV0FBVyxFQUFFLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRyxZQUFZLEVBQUUsY0FBYyxFQUFDLENBQUUsQ0FBQztBQUN4RixJQUFJLGlCQUFpQixDQUFDLEdBQUcsRUFBRSxXQUFXLEVBQUUsRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFHLFlBQVksRUFBRSxTQUFTLEVBQUMsQ0FBRSxDQUFDO0FBRW5GLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBlY3MgPSByZXF1aXJlKCdAYXdzLWNkay9hd3MtZWNzJyk7XG5pbXBvcnQgY2RrID0gcmVxdWlyZSgnQGF3cy1jZGsvY29yZScpO1xuLy8gaW1wb3J0IHsgUm9sZSwgU2VydmljZVByaW5jaXBhbCwgUG9saWN5U3RhdGVtZW50LCBFZmZlY3QgfSBmcm9tICdAYXdzLWNkay9hd3MtaWFtJztcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdAYXdzLWNkay9hd3MtaWFtJztcbmltcG9ydCAqIGFzIHNlY3JldHNtYW5hZ2VyIGZyb20gJ0Bhd3MtY2RrL2F3cy1zZWNyZXRzbWFuYWdlcic7XG5pbXBvcnQgZWMyID0gcmVxdWlyZSgnQGF3cy1jZGsvYXdzLWVjMicpO1xuXG5pbnRlcmZhY2UgTXVsdGlzdGFja1Byb3BzIGV4dGVuZHMgY2RrLlN0YWNrUHJvcHMge1xuICBtaWNyb3NlcnZpY2U/OiBzdHJpbmc7XG59XG5cbmNsYXNzIEZhcmdhdGVTZXJ2aWNlTkxCIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgY29uc3RydWN0b3Ioc2NvcGU6IGNkay5BcHAsIGlkOiBzdHJpbmcsIHByb3BzPzogTXVsdGlzdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG4gICAgXG4gICAgdmFyIG1hc3RlciA9IHByb3BzICYmIHByb3BzLm1pY3Jvc2VydmljZTtcbiAgICB2YXIgdGFza05hbWUgPSBcInRhc2std2lzZS1kZXYtYXAtc3ByaW5nLVwiICsgbWFzdGVyO1xuICAgIHZhciBzZXJ2aWNlTmFtZSA9IFwic2VydmljZS13aXNlLWRldi1hcC1zcHJpbmctXCIgKyBtYXN0ZXI7XG4gICAgXG4gICAgdmFyIG1haW5JbWFnZVVSTCA9IFwiYW1hem9uL2FtYXpvbi1lY3Mtc2FtcGxlXCI7XG4gICAgdmFyIHNpZGVjYXJMb2dVUkwgPSBcImhlbGxvLXdvcmxkXCI7XG4gICAgdmFyIHNpZGVjYXJYUmF5VVJMID0gXCJoZWxsby13b3JsZFwiO1xuICAgIHZhciBtYWluQ29udGFpbmVyTmFtZSA9IFwiY29udGFpbmVyLXdpc2UtZGV2LWFwLXNwcmluZy1cIiArIG1hc3RlciArIFwiLXNwclwiO1xuICAgIHZhciBzaWRlY2FyTG9nTmFtZSA9IFwiY29udGFpbmVyLXdpc2UtZGV2LWFwLXNwcmluZy1cIiArIG1hc3RlciArIFwiLWxvZ1wiO1xuICAgIHZhciBzaWRlY2FyWFJheU5hbWUgPSBcImNvbnRhaW5lci13aXNlLWRldi1hcC1zcHJpbmctXCIgKyBtYXN0ZXIgKyBcIi14cmF5XCI7XG4gICAgXG4gICAgXG4gICAgLy8xLiBWUENcbiAgICBjb25zdCB2cGMgPSBlYzIuVnBjLmZyb21Mb29rdXAodGhpcywgJ0ltcG9ydFZQQycse2lzRGVmYXVsdDogZmFsc2UsdnBjSWQ6IFwidnBjLTA5N2ZlZGYzNzg3ODg5ZDNhXCIgfSk7XG4gICAgLy8yLiBJQU0gcm9sZVxuICAgIGNvbnN0IGV4ZWNSb2xlID0gaWFtLlJvbGUuZnJvbVJvbGVBcm4odGhpcywgJ1JvbGUnLCAnYXJuOmF3czppYW06OjI3ODc3Mjk5ODc3Njpyb2xlL2Vjcy10YXNrLXRlc3QnKTtcbiAgICAvLzMuIHNlY3VyaXR5R3JvdXBcbiAgICBjb25zdCBzZWN1cml0eUdyb3VwID0gZWMyLlNlY3VyaXR5R3JvdXAuZnJvbVNlY3VyaXR5R3JvdXBJZCh0aGlzLCAnc2VjdXJpdHlncm91cCcsICdzZy0wM2Q4ZDkzMzQwODVmMDM5YScpO1xuICAgIC8vNC4gQ3JlYXRlIHRoZSBFQ1MgZmFyZ2F0ZSBjbHVzdGVyXG4gICAgY29uc3QgY2x1c3RlciA9IG5ldyBlY3MuQ2x1c3Rlcih0aGlzLCAnY2x1c3Rlci13aXNlLWRldi1hcCcsIHsgdnBjLCBjbHVzdGVyTmFtZTogXCJjbHVzdGVyLXdpc2UtZGV2LWFwXCIgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgLy81LiBDcmVhdGUgYSB0YXNrIGRlZmluaXRpb24gZm9yIG91ciBjbHVzdGVyIHRvIGludm9rZSBhIHRhc2tcbiAgICBjb25zdCB0YXNrRGVmID0gbmV3IGVjcy5GYXJnYXRlVGFza0RlZmluaXRpb24odGhpcywgdGFza05hbWUsIHtcbiAgICAgIGZhbWlseTogdGFza05hbWUsXG4gICAgICBtZW1vcnlMaW1pdE1pQjogNTEyLFxuICAgICAgY3B1OiAyNTYsXG4gICAgICBleGVjdXRpb25Sb2xlOiBleGVjUm9sZSxcbiAgICAgIHRhc2tSb2xlOiBleGVjUm9sZVxuICAgIH0pO1xuICAgIFxuICAgIGNvbnN0IG15U2VjcmV0QXJuID0gY2RrLlN0YWNrLm9mKHRoaXMpLmZvcm1hdEFybih7XG4gICAgICBzZXJ2aWNlOiAnc2VjcmV0c21hbmFnZXInLFxuICAgICAgcmVzb3VyY2U6ICdzZWNyZXQnLFxuICAgICAgcmVzb3VyY2VOYW1lOiBcImRldi9hcHBCZXRhL015c3FsOnBhc3N3b3JkOjpcIixcbiAgICAgIHNlcDogJzonLFxuICAgIH0pO1xuICAgIGNvbnN0IG15U2VjcmV0ID0gc2VjcmV0c21hbmFnZXIuU2VjcmV0LmZyb21TZWNyZXRBcm4odGhpcywgJ215c2VjcmV0JywgbXlTZWNyZXRBcm4pO1xuICAgIGNvbnN0IG15U2VjcmV0RW52ID0gZWNzLlNlY3JldC5mcm9tU2VjcmV0c01hbmFnZXIobXlTZWNyZXQpO1xuXG4gICAgLy83LiBDcmVhdGUgY29udGFpbmVyIGZvciB0aGUgdGFzayBkZWZpbml0aW9uIGZyb20gRUNSIGltYWdlXG4gICAgdGFza0RlZi5hZGRDb250YWluZXIobWFpbkNvbnRhaW5lck5hbWUsIHtcbiAgICAgIGltYWdlOiBlY3MuQ29udGFpbmVySW1hZ2UuZnJvbVJlZ2lzdHJ5KG1haW5JbWFnZVVSTCksXG4gICAgICBlc3NlbnRpYWw6IHRydWUsXG4vLyAgICAgICBlbnZpcm9ubWVudDoge1xuLy8gICAgICAgICBcIk1ZU1FMX0hPU1RcIjogXCJBUk46aG9zdDo6XCIsXG4vLyAgICAgICAgIFwiTVlTUUxfUE9SVFwiOiBcIkFSTjpwb3J0OjpcIixcbi8vICAgICAgICAgXCJNWVNRTF9VU0VSXCI6IFwiQVJOOnVzZXJuYW1lOjpcIixcbi8vICAgICAgICAgXCJNWVNRTF9QQVNTV09SRFwiOiBcIkFSTjpwYXNzd29yZDo6XCIsXG4vLyAgICAgICAgIFwiTVlTUUxfREFUQUJBU0VcIjogXCJBUk46ZGJuYW1lOjpcIixcbi8vICAgICAgICAgXCJSRURJU19IT1NUXCI6IFwiQVJOXCJcbi8vICAgICAgIH0sXG4gICAgICBzZWNyZXRzOiB7XG4gICAgICAgIC8vIEFzc2lnbiBhIEpTT04gdmFsdWUgZnJvbSB0aGUgc2VjcmV0IHRvIGEgZW52aXJvbm1lbnQgdmFyaWFibGVcbiAgICAgICAgTVlTUUxfUEFTU1dPUkQ6IG15U2VjcmV0RW52LFxuXG4gICAgICB9XG4gICAgfSkuYWRkUG9ydE1hcHBpbmdzKHtjb250YWluZXJQb3J0OiA4MH0pOyAvLzguIEFkZCBwb3J0IG1hcHBpbmdzIHRvIHlvdXIgY29udGFpbmVyLi4uTWFrZSBzdXJlIHlvdSB1c2UgVENQIHByb3RvY29sIGZvciBOZXR3b3JrIExvYWQgQmFsYW5jZXIgKE5MQilcbiAgICBcbiAgICB0YXNrRGVmLmFkZENvbnRhaW5lcihzaWRlY2FyTG9nTmFtZSwge1xuICAgICAgaW1hZ2U6IGVjcy5Db250YWluZXJJbWFnZS5mcm9tUmVnaXN0cnkoc2lkZWNhckxvZ1VSTCksXG4gICAgICBlc3NlbnRpYWw6IGZhbHNlXG4gICAgfSlcbiAgICBcbiAgICB0YXNrRGVmLmFkZENvbnRhaW5lcihzaWRlY2FyWFJheU5hbWUsIHtcbiAgICAgIGltYWdlOiBlY3MuQ29udGFpbmVySW1hZ2UuZnJvbVJlZ2lzdHJ5KHNpZGVjYXJYUmF5VVJMKSxcbiAgICAgIGVzc2VudGlhbDogZmFsc2VcbiAgICB9KVxuXG5cbiAgICAvLzEzLiBDcmVhdGUgRmFyZ2F0ZSBTZXJ2aWNlIGZyb20gY2x1c3RlciwgdGFzayBkZWZpbml0aW9uIGFuZCB0aGUgc2VjdXJpdHkgZ3JvdXBcbiAgICBuZXcgZWNzLkZhcmdhdGVTZXJ2aWNlKHRoaXMsIHNlcnZpY2VOYW1lLCB7XG4gICAgICBjbHVzdGVyLFxuICAgICAgdGFza0RlZmluaXRpb246IHRhc2tEZWYsIFxuICAgICAgYXNzaWduUHVibGljSXA6IHRydWUsIFxuICAgICAgc2VydmljZU5hbWU6IHNlcnZpY2VOYW1lLFxuICAgICAgc2VjdXJpdHlHcm91cDpzZWN1cml0eUdyb3VwLFxuICAgICAgZGVzaXJlZENvdW50OiAwXG4gICAgfSk7XG5cbi8vICAgICAvLzE0LiBBZGQgZmFyZ2F0ZSBzZXJ2aWNlIHRvIHRoZSBsaXN0ZW5lciBcbi8vICAgICBsaXN0ZW5lci5hZGRUYXJnZXRzKCdzZWFyY2gtYXBpLXRnJywge1xuLy8gICAgICAgdGFyZ2V0R3JvdXBOYW1lOiAnc2VhcmNoLWFwaS10ZycsXG4vLyAgICAgICBwb3J0OiA4MCxcbi8vICAgICAgIHRhcmdldHM6IFtmYXJnYXRlU2VydmljZV0sXG4vLyAgICAgICBkZXJlZ2lzdHJhdGlvbkRlbGF5OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMDApXG4vLyAgICAgfSk7XG5cbi8vICAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQ2x1c3RlckFSTjogJywgeyB2YWx1ZTogY2x1c3Rlci5jbHVzdGVyQXJuIH0pO1xuICB9XG59XG5cbi8vIGZvciBkZXZlbG9wbWVudCwgdXNlIGFjY291bnQvcmVnaW9uIGZyb20gY2RrIGNsaVxuY29uc3QgZGV2RW52ID0ge1xuICBhY2NvdW50OiBcIjI3ODc3Mjk5ODc3NlwiLFxuICByZWdpb246IFwidXMtZWFzdC0xXCIsXG59O1xuXG5cbmNvbnN0IGFwcCA9IG5ldyBjZGsuQXBwKCk7XG5cbm5ldyBGYXJnYXRlU2VydmljZU5MQihhcHAsICd3aXNlLWRlbW8nLCB7IGVudjogZGV2RW52LCAgbWljcm9zZXJ2aWNlOiBcIm1hc3RlclwifSwpO1xubmV3IEZhcmdhdGVTZXJ2aWNlTkxCKGFwcCwgJ3dpc2UtZGVtbycsIHsgZW52OiBkZXZFbnYsICBtaWNyb3NlcnZpY2U6IFwid29ya2Zsb3dcIn0sKTtcbm5ldyBGYXJnYXRlU2VydmljZU5MQihhcHAsICd3aXNlLWRlbW8nLCB7IGVudjogZGV2RW52LCAgbWljcm9zZXJ2aWNlOiBcIm5vdGlmaWNhdGlvblwifSwpO1xubmV3IEZhcmdhdGVTZXJ2aWNlTkxCKGFwcCwgJ3dpc2UtZGVtbycsIHsgZW52OiBkZXZFbnYsICBtaWNyb3NlcnZpY2U6IFwiZ2F0ZXdheVwifSwpO1xuXG5hcHAuc3ludGgoKTtcbiJdfQ==