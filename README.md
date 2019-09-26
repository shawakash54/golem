# Golem

### Create an .env file with following contents:
ES_HOST=<YOUR_ES_HOST>

### Steps to deployment

- Dockerise the app
`docker build -f Dockerfile . -t golem_demo`
- Create an ECR Repository and note down the URI
- Tag the above docker image with
`docker tag golem_demo:latest <YOUR_ECR_REPOSITORY_URI>/golem_demo:latest`      ---->   TAGGED_IMAGE
- Get the docker login credential for ECR
`aws ecr get-login  --no-include-email --region <HOSTED_AWS_REGION> --profile <YOUR_AWS_PROFILE>`
- Copy the returned docker login command and run it
- Now, we can push to ECR Repository created above using docker push:
`docker push <TAGGED_IMAGE>/golem_demo:latest`


#### At this point, we have pushed our docker image to ECR and can now carry on with the creatin of cluster and a task.

- Create a Task Definition - Fargate
- Create a Cluster - Fargate
- Create a ECS Task with above created cluster.

##### Run the task and check the logs to see it in action.

##### Work Pending:
- Creating a lambda to regularly invoke the fargate task

