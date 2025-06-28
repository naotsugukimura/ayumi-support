#!/bin/bash

# ====================================
# SupportDocs AWS Production Deployment Script
# ====================================
# This script automates the deployment of SupportDocs to AWS
# Prerequisites: AWS CLI, Docker, docker-compose installed

set -e

# Configuration
APP_NAME="support-docs"
ENVIRONMENT="production"
AWS_REGION="ap-northeast-1"
ECR_REPOSITORY="${APP_NAME}-${ENVIRONMENT}"
EC2_KEY_NAME="support-docs-keypair"
VPC_NAME="${APP_NAME}-vpc"
SECURITY_GROUP_NAME="${APP_NAME}-sg"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

echo_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

echo_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    echo_info "Checking prerequisites..."
    
    if ! command -v aws &> /dev/null; then
        echo_error "AWS CLI is not installed"
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        echo_error "Docker is not installed"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo_error "docker-compose is not installed"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        echo_error "AWS credentials not configured"
        exit 1
    fi
    
    echo_success "All prerequisites met"
}

# Create AWS infrastructure
setup_aws_infrastructure() {
    echo_info "Setting up AWS infrastructure..."
    
    # Get AWS Account ID
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    echo_info "AWS Account ID: $AWS_ACCOUNT_ID"
    
    # Create ECR repository
    echo_info "Creating ECR repository..."
    aws ecr create-repository \
        --repository-name $ECR_REPOSITORY \
        --region $AWS_REGION \
        --image-scanning-configuration scanOnPush=true \
        --encryption-configuration encryptionType=AES256 \
        || echo_info "ECR repository already exists"
    
    # Create RDS PostgreSQL instance
    echo_info "Creating RDS PostgreSQL instance..."
    aws rds create-db-instance \
        --db-instance-identifier $APP_NAME-postgres \
        --db-instance-class db.t3.micro \
        --engine postgres \
        --engine-version 15.4 \
        --master-username supportdocs \
        --master-user-password "$DB_PASSWORD" \
        --allocated-storage 20 \
        --storage-type gp2 \
        --storage-encrypted \
        --vpc-security-group-ids "$SECURITY_GROUP_ID" \
        --backup-retention-period 7 \
        --multi-az false \
        --publicly-accessible false \
        --auto-minor-version-upgrade true \
        --region $AWS_REGION \
        || echo_info "RDS instance already exists"
    
    # Create S3 bucket for file storage
    echo_info "Creating S3 bucket..."
    aws s3 mb s3://$APP_NAME-files-$ENVIRONMENT-$AWS_ACCOUNT_ID --region $AWS_REGION \
        || echo_info "S3 bucket already exists"
    
    # Enable S3 bucket encryption
    aws s3api put-bucket-encryption \
        --bucket $APP_NAME-files-$ENVIRONMENT-$AWS_ACCOUNT_ID \
        --server-side-encryption-configuration '{
            "Rules": [
                {
                    "ApplyServerSideEncryptionByDefault": {
                        "SSEAlgorithm": "AES256"
                    }
                }
            ]
        }'
    
    echo_success "AWS infrastructure setup completed"
}

# Build and push Docker image
build_and_push_image() {
    echo_info "Building and pushing Docker image..."
    
    # Get ECR login token
    aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
    
    # Build image
    docker build -t $ECR_REPOSITORY:latest .
    
    # Tag image
    docker tag $ECR_REPOSITORY:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:latest
    docker tag $ECR_REPOSITORY:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:$(date +%Y%m%d%H%M%S)
    
    # Push image
    docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:latest
    docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:$(date +%Y%m%d%H%M%S)
    
    echo_success "Docker image built and pushed successfully"
}

# Create EC2 instance
create_ec2_instance() {
    echo_info "Creating EC2 instance..."
    
    # Create user data script
    cat > user-data.sh << 'EOF'
#!/bin/bash
yum update -y
amazon-linux-extras install docker -y
service docker start
usermod -a -G docker ec2-user
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
rpm -U ./amazon-cloudwatch-agent.rpm

# Install AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
./aws/install

# Create application directory
mkdir -p /app
cd /app

# Download application files from S3 or Git
# Note: In production, you would typically pull from a Git repository or S3
EOF

    # Launch EC2 instance
    INSTANCE_ID=$(aws ec2 run-instances \
        --image-id ami-0c02fb55956c7d316 \
        --count 1 \
        --instance-type t3.small \
        --key-name $EC2_KEY_NAME \
        --security-group-ids $SECURITY_GROUP_ID \
        --subnet-id $SUBNET_ID \
        --user-data file://user-data.sh \
        --iam-instance-profile Name=$APP_NAME-ec2-role \
        --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$APP_NAME-$ENVIRONMENT},{Key=Environment,Value=$ENVIRONMENT}]" \
        --query 'Instances[0].InstanceId' \
        --output text)
    
    echo_success "EC2 instance created: $INSTANCE_ID"
    
    # Wait for instance to be running
    echo_info "Waiting for instance to be running..."
    aws ec2 wait instance-running --instance-ids $INSTANCE_ID
    
    # Get public IP
    PUBLIC_IP=$(aws ec2 describe-instances \
        --instance-ids $INSTANCE_ID \
        --query 'Reservations[0].Instances[0].PublicIpAddress' \
        --output text)
    
    echo_success "Instance is running at: $PUBLIC_IP"
}

# Deploy application
deploy_application() {
    echo_info "Deploying application..."
    
    # Create deployment package
    tar -czf deployment.tar.gz \
        docker-compose.production.yml \
        .env.production \
        nginx/ \
        ssl/ \
        database/ \
        aws/ \
        secrets/
    
    # Upload to EC2 instance
    scp -i ~/.ssh/$EC2_KEY_NAME.pem deployment.tar.gz ec2-user@$PUBLIC_IP:/home/ec2-user/
    
    # Deploy via SSH
    ssh -i ~/.ssh/$EC2_KEY_NAME.pem ec2-user@$PUBLIC_IP << 'ENDSSH'
cd /home/ec2-user
tar -xzf deployment.tar.gz

# Pull latest image
aws ecr get-login-password --region ap-northeast-1 | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.ap-northeast-1.amazonaws.com

# Start services
docker-compose -f docker-compose.production.yml up -d

# Check health
sleep 30
curl -f http://localhost:3000/api/health
ENDSSH
    
    echo_success "Application deployed successfully"
}

# Main execution
main() {
    echo_info "Starting SupportDocs AWS deployment..."
    
    # Load environment variables
    if [ -f .env.production ]; then
        source .env.production
    else
        echo_error ".env.production file not found. Please create it from .env.production.template"
        exit 1
    fi
    
    check_prerequisites
    setup_aws_infrastructure
    build_and_push_image
    create_ec2_instance
    deploy_application
    
    echo_success "🎉 Deployment completed successfully!"
    echo_info "Application URL: https://$PUBLIC_IP"
    echo_info "Admin URL: https://$PUBLIC_IP/api-test.html"
    echo_info "Demo URL: https://$PUBLIC_IP/demo"
    
    # Clean up
    rm -f user-data.sh deployment.tar.gz
}

# Run if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi