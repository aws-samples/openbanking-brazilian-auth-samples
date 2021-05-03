#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import { OpenBankingAuthStack } from '../lib/open-banking-auth-stack';

const app = new cdk.App();
new OpenBankingAuthStack(app, 'OpenBankingAuthStack');