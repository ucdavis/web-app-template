using System.Security.Claims;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Server.Controllers;
using Server.Models.Notification;
using Server.Core.Notification;

namespace Server.Tests.Notification;

public class NotificationControllerTests
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
        okResult.Value.Should().BeOfType<SendSampleNotificationResponse>()
            .Which.To.Should().Be("person@example.com");

        notificationService.Invocations.Should().ContainSingle();
        notificationService.Invocations[0].Recipients.To.Should().Equal("person@example.com");
        notificationService.Invocations[0].Subject.Should().Be("Subject");
        notificationService.Invocations[0].Header.Should().Be("Header");
        notificationService.Invocations[0].Message.Should().Be("Message");
    }

    [Fact]
    public async Task Default_endpoint_uses_email_claim_when_preferred_username_is_absent()
    {
        var notificationService = new FakeNotificationService();
        var controller = CreateController(
            environmentName: Environments.Development,
            notificationService: notificationService,
            claims:
            [
                new Claim(ClaimTypes.Email, "email-claim@example.com"),
            ]);

        var result = await controller.SendSample(new NotificationRequest
        {
            Subject = "Subject",
            Header = "Header",
            Message = "Message",
            To = "",
        }, CancellationToken.None);

        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().BeOfType<SendSampleNotificationResponse>()
            .Which.To.Should().Be("email-claim@example.com");

        notificationService.Invocations.Should().ContainSingle();
        notificationService.Invocations[0].Recipients.To.Should().Equal("email-claim@example.com");
    }

    [Fact]
    public async Task Default_endpoint_uses_explicit_to_when_provided()
    {
        var notificationService = new FakeNotificationService();
        var controller = CreateController(
            environmentName: Environments.Development,
            notificationService: notificationService,
            claims:
            [
                new Claim("preferred_username", "signed-in@example.com"),
            ]);

        var result = await controller.SendSample(new NotificationRequest
        {
            Subject = "Subject",
            Header = "Header",
            Message = "Message",
            To = "explicit@example.com",
        }, CancellationToken.None);

        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().BeOfType<SendSampleNotificationResponse>()
            .Which.To.Should().Be("explicit@example.com");

        notificationService.Invocations.Should().ContainSingle();
        notificationService.Invocations[0].Recipients.To.Should().Equal("explicit@example.com");
        notificationService.Invocations[0].Subject.Should().Be("Subject");
        notificationService.Invocations[0].Header.Should().Be("Header");
        notificationService.Invocations[0].Message.Should().Be("Message");
    }

    [Fact]
    public async Task Default_endpoint_returns_bad_request_when_service_throws_validation_exception()
    {
        var notificationService = new ThrowingNotificationService(
            new System.ComponentModel.DataAnnotations.ValidationException("Notification subject is required."));
        var controller = CreateController(
            environmentName: Environments.Development,
            notificationService: notificationService,
            claims:
            [
                new Claim("preferred_username", "person@example.com"),
            ]);

        var result = await controller.SendSample(new NotificationRequest
        {
            Subject = "",
            Header = "Header",
            Message = "Message",
        }, CancellationToken.None);

        var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        badRequestResult.Value.Should().Be("Notification subject is required.");
    }

    [Fact]
    public async Task Table_endpoint_uses_current_user_email_and_passes_rows_and_total()
    {
        var notificationService = new FakeNotificationService();
        var controller = CreateController(
            environmentName: Environments.Development,
            notificationService: notificationService,
            claims:
            [
                new Claim("preferred_username", "person@example.com"),
            ]);

        var result = await controller.SendTableSample(new TableNotificationRequest
        {
            Subject = "Subject",
            Header = "Header",
            Message = "Summary message",
            Rows =
            [
                new TableNotificationRowRequest
                {
                    Title = "Design",
                    Details = "Initial exploration",
                    Amount = 75m,
                },
                new TableNotificationRowRequest
                {
                    Title = "Build",
                    Details = "Implementation",
                    Amount = 125m,
                },
            ],
            TotalAmount = 200m,
        }, CancellationToken.None);

        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().BeOfType<SendSampleNotificationResponse>()
            .Which.To.Should().Be("person@example.com");

        notificationService.TableInvocations.Should().ContainSingle();
        notificationService.TableInvocations[0].Recipients.To.Should().Equal("person@example.com");
        notificationService.TableInvocations[0].Subject.Should().Be("Subject");
        notificationService.TableInvocations[0].Header.Should().Be("Header");
        notificationService.TableInvocations[0].Message.Should().Be("Summary message");
        notificationService.TableInvocations[0].Rows.Should().HaveCount(2);
        notificationService.TableInvocations[0].Rows[0].Title.Should().Be("Design");
        notificationService.TableInvocations[0].Rows[0].Details.Should().Be("Initial exploration");
        notificationService.TableInvocations[0].Rows[0].Amount.Should().Be(75m);
        notificationService.TableInvocations[0].Rows[1].Title.Should().Be("Build");
        notificationService.TableInvocations[0].Rows[1].Details.Should().Be("Implementation");
        notificationService.TableInvocations[0].Rows[1].Amount.Should().Be(125m);
        notificationService.TableInvocations[0].TotalAmount.Should().Be(200m);
    }

    private static NotificationController CreateController(
        string environmentName,
        INotificationService notificationService,
        Claim[]? claims = null)
    {
        var controller = new NotificationController(
            new FakeHostEnvironment(environmentName),
            NullLogger<NotificationController>.Instance,
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
        public List<TableInvocation> TableInvocations { get; } = [];

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

        public Task SendTableAsync(
            EmailRecipients recipients,
            string subject,
            string header,
            string message,
            IReadOnlyList<NotificationTableRow> rows,
            decimal totalAmount,
            CancellationToken cancellationToken = default)
        {
            TableInvocations.Add(new TableInvocation(recipients, subject, header, message, rows, totalAmount));
            return Task.CompletedTask;
        }
    }

    private sealed class ThrowingNotificationService : INotificationService
    {
        private readonly Exception _exception;

        public ThrowingNotificationService(Exception exception)
        {
            _exception = exception;
        }

        public Task SendAsync(
            EmailRecipients recipients,
            string subject,
            string header,
            string message,
            CancellationToken cancellationToken = default)
        {
            throw _exception;
        }

        public Task SendTableAsync(
            EmailRecipients recipients,
            string subject,
            string header,
            string message,
            IReadOnlyList<NotificationTableRow> rows,
            decimal totalAmount,
            CancellationToken cancellationToken = default)
        {
            throw _exception;
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

    private sealed record TableInvocation(
        EmailRecipients Recipients,
        string Subject,
        string Header,
        string Message,
        IReadOnlyList<NotificationTableRow> Rows,
        decimal TotalAmount);
}
