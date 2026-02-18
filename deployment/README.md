# AWS Deployment Guide

## Quick Start

### Step 1: Configure AWS CLI

AWS CLI requires Access Keys (not email/password). To get Access Keys:

1. Go to: https://console.aws.amazon.com/iam/
2. Sign in with your AWS account
3. Click 'Users' â†’ Your username â†’ 'Security credentials'
4. Click 'Create access key'
5. Choose 'Command Line Interface (CLI)'
6. Copy the Access Key ID and Secret Access Key

Then run:
`powershell
.\configure-aws.ps1
`

Or manually:
`powershell
aws configure
`

### Step 2: Run Deployment

`powershell
.\deploy-complete.ps1
`

This will:
- Create ECR repository
- Build and push Docker image
- Create EC2 instance (t2.micro, free tier)
- Deploy backend automatically
- Guide you through Amplify setup

## Files Created

- mplify.yml - Amplify build configuration
- configure-aws.ps1 - AWS CLI configuration helper
- deploy-complete.ps1 - Complete deployment automation

## Requirements

- AWS Account
- AWS CLI installed
- Docker (optional, for local image build)
- Git repository (for Amplify)

## Cost

- EC2 t2.micro: FREE for 12 months (750 hours/month)
- Amplify: FREE for 12 months (1000 build minutes/month)
- ECR: FREE (500MB storage)
- Total: /month for first year
