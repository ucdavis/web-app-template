using System.Diagnostics;

namespace server.Helpers;

public static class LoggingMiddlewareHelper
{
    /// <summary>
    /// Adds request context enrichment middleware that includes trace info, user info, and client details in log scope
    /// </summary>
    public static void UseRequestContextLogging(this WebApplication app)
    {
        app.Use(async (ctx, next) =>
        {
            // ASP.NET's intrinsic request id + W3C trace context
            var requestId = ctx.TraceIdentifier;
            var activity = Activity.Current;
            var traceId = activity?.TraceId.ToString();
            var spanId = activity?.SpanId.ToString();

            // user info (name/ID if authenticated)
            var userName = ctx.User.Identity?.IsAuthenticated == true
                ? (ctx.User.Identity?.Name ?? "authenticated")
                : "anonymous";

            // client IP (respects ForwardedHeaders above)
            var clientIp = ctx.Connection.RemoteIpAddress?.ToString();

            // user agent
            var ua = ctx.Request.Headers.UserAgent.ToString();

            // Make these available to all logs in this request
            using (app.Logger.BeginScope(new Dictionary<string, object?>
            {
                ["user.name"] = userName,
                ["request.id"] = requestId,
                ["trace.id"] = traceId,
                ["span.id"] = spanId,
                ["client.ip"] = clientIp,
                ["user_agent.original"] = ua
            }))
            {
                await next();
            }
        });
    }
}