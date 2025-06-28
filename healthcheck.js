#!/usr/bin/env node

/**
 * Health Check Script for 歩みサポート (Ayumi Support)
 * Used by Docker and AWS for health monitoring
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const HEALTH_CHECK_TIMEOUT = parseInt(process.env.HEALTH_CHECK_TIMEOUT) || 5000;

// Health check configuration
const healthChecks = [
    {
        name: 'HTTP Server',
        check: checkHttpServer
    },
    {
        name: 'File System',
        check: checkFileSystem
    },
    {
        name: 'Environment Variables',
        check: checkEnvironmentVariables
    }
];

/**
 * Check if HTTP server is responding
 */
function checkHttpServer() {
    return new Promise((resolve, reject) => {
        const req = http.get(`http://localhost:${PORT}/api/health`, {
            timeout: HEALTH_CHECK_TIMEOUT
        }, (res) => {
            if (res.statusCode === 200) {
                resolve({ status: 'healthy', message: 'HTTP server responding' });
            } else {
                reject(new Error(`HTTP server returned status ${res.statusCode}`));
            }
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Health check request timed out'));
        });

        req.on('error', (err) => {
            reject(new Error(`HTTP server error: ${err.message}`));
        });
    });
}

/**
 * Check if required directories exist and are writable
 */
function checkFileSystem() {
    return new Promise((resolve, reject) => {
        const requiredPaths = [
            { path: '/app/uploads', writable: true },
            { path: '/app/generated', writable: true },
            { path: '/app/logs', writable: true }
        ];

        try {
            for (const { path: dirPath, writable } of requiredPaths) {
                // Check if directory exists
                if (!fs.existsSync(dirPath)) {
                    throw new Error(`Directory ${dirPath} does not exist`);
                }

                // Check if directory is writable
                if (writable) {
                    fs.accessSync(dirPath, fs.constants.W_OK);
                }
            }

            resolve({ status: 'healthy', message: 'File system accessible' });
        } catch (error) {
            reject(new Error(`File system check failed: ${error.message}`));
        }
    });
}

/**
 * Check if required environment variables are set
 */
function checkEnvironmentVariables() {
    return new Promise((resolve, reject) => {
        const requiredEnvVars = [
            'NODE_ENV',
            'OPENAI_API_KEY',
            'ANTHROPIC_API_KEY'
        ];

        const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

        if (missingVars.length > 0) {
            reject(new Error(`Missing environment variables: ${missingVars.join(', ')}`));
        } else {
            resolve({ status: 'healthy', message: 'Environment variables configured' });
        }
    });
}

/**
 * Run all health checks
 */
async function runHealthChecks() {
    const results = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        checks: {}
    };

    let hasErrors = false;

    for (const { name, check } of healthChecks) {
        try {
            const result = await Promise.race([
                check(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Check timeout')), HEALTH_CHECK_TIMEOUT)
                )
            ]);
            
            results.checks[name] = {
                status: 'healthy',
                message: result.message || 'OK',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            hasErrors = true;
            results.checks[name] = {
                status: 'unhealthy',
                message: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    if (hasErrors) {
        results.status = 'unhealthy';
    }

    return results;
}

/**
 * Main execution
 */
async function main() {
    try {
        const results = await runHealthChecks();
        
        if (results.status === 'healthy') {
            console.log('✅ Health check passed');
            process.exit(0);
        } else {
            console.error('❌ Health check failed');
            console.error(JSON.stringify(results, null, 2));
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Health check error:', error.message);
        process.exit(1);
    }
}

// Run if executed directly
if (require.main === module) {
    main();
}

module.exports = { runHealthChecks };