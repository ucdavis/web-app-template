# Azure deployment

GitHub Actions is the primary deployment path. Follow [Azure deployment setup](../../README.customization.md#5-azure-deployment-setup) for the one-time OIDC bootstrap and GitHub Environment configuration.

1. Run **Configure Azure** for infrastructure or runtime setting changes.
2. Run **CI/CD** for a package deployment. Pushes to `main` deploy to test; manual runs can select test or prod.
3. Check the deployment's application health result and verify sign-in at the app's hostname.

Local `deploy_test.sh` and `deploy_prod.sh` are secondary operator tools. They apply runtime settings as part of deployment and do not perform the GitHub workflow's explicit application health check. Verify `/health` and sign-in after using them.

## Production SQL connectivity

Fresh production provisioning does not establish an application network access path to SQL. The template creates SQL with public network access enabled, but its broad Azure-services firewall rule is enabled only in test. It does not create private endpoints or App Service VNet integration.

Before the first production package deployment, configure a suitable SQL firewall rule for the App Service's outbound addresses, or configure private connectivity with routing and DNS. If using firewall rules, account for the outbound addresses that may change with the hosting plan. See [App Service outbound addresses](https://learn.microsoft.com/azure/app-service/overview-inbound-outbound-ips) and [Azure SQL firewall rules](https://learn.microsoft.com/azure/azure-sql/database/firewall-configure).

The application applies EF migrations during startup and `/health` checks SQL connectivity. Confirm `/health` returns 200 after startup; a successful infrastructure deployment alone does not prove database access. Then verify sign-in separately.

The broader documentation rewrite is tracked in [issue #39](https://github.com/ucdavis/web-app-template/issues/39).
