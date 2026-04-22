using System.Security.Claims;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Server.Controllers;
using Server.Models.Notifications;
using server.core.Notifications;

namespace server.tests.Notifications;

public class NotificationsControllerTests
{
    [Fact]
    public async Task Default_endpoint_returns_not_found_outside_development()
    {
        var notificationService = new FakeNotificationService();
        var controller = CreateController(
            environmentName: "Production",
            notificationService: notificationService);

        var result = await controller.SendSample(new NotificationRequest
        {
            Subject = "Subject",
            Header = "Header",
            Message = "Message",
            To = "person@example.com",
        }, CancellationToken.None);

        result.Should().BeOfType<NotFoundResult>();
        notificationService.Invocations.Should().BeEmpty();
    }

    [Fact]
    public async Task Default_endpoint_returns_bad_request_when_no_recipient_can_be_resolved()
    {
        var controller = CreateController(
            environmentName: Environments.Development,
            notificationService: new FakeNotificationService());

        var result = await controller.SendSample(new NotificationRequest
        {
            Subject = "Subject",
            Header = "Header",
            Message = "Message",
        }, CancellationToken.None);

        var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequestResult.Value.Should().Be("No email recipient was provided and the current user does not have an email claim.");
    }

    [Fact]
    public async Task Default_endpoint_uses_current_user_email_when_override_is_blank()
    {
        var notificationService = new FakeNotificationService();
        var controller = CreateController(
            environmentName: Environments.Development,
            notificationService: notificationService,
            claims:
            [
                new Claim("preferred_username", "person@example.com"),
            ]);

        var result = await controller.SendSample(new NotificationRequest
        {
            Subject = "Subject",
            Header = "Header",
            Message = "Message",
            To = "",
        }, CancellationToken.None);

        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().BeEquivalentTo(new
        {
            to = "person@example.com",
        });

        notificationService.Invocations.Should().ContainSingle();
        notificationService.Invocations[0].Recipients.To.Should().Equal("person@example.com");
        notificationService.Invocations[0].Subject.Should().Be("Subject");
        notificationService.Invocations[0].Header.Should().Be("Header");
        notificationService.Invocations[0].Message.Should().Be("Message");
    }

    private static NotificationsController CreateController(
        string environmentName,
        INotificationService notificationService,
        Claim[]? claims = null)
    {
        var controller = new NotificationsController(
            new FakeHostEnvironment(environmentName),
            notificationService);

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(claims ?? [], "TestAuth")),
            },
        };

        return controller;
    }

    private sealed class FakeNotificationService : INotificationService
    {
        public List<Invocation> Invocations { get; } = [];

        public Task SendAsync(
            EmailRecipients recipients,
            string subject,
            string header,
            string message,
            CancellationToken cancellationToken = default)
        {
            Invocations.Add(new Invocation(recipients, subject, header, message));
            return Task.CompletedTask;
        }
    }

    private sealed class FakeHostEnvironment : IHostEnvironment
    {
        public FakeHostEnvironment(string environmentName)
        {
            EnvironmentName = environmentName;
        }

        public string EnvironmentName { get; set; }
        public string ApplicationName { get; set; } = "server.tests";
        public string ContentRootPath { get; set; } = "/workspace";
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }

    private sealed record Invocation(
        EmailRecipients Recipients,
        string Subject,
        string Header,
        string Message);
}
