using Microsoft.AspNetCore.Mvc;

namespace Server.Controllers;

// base controller for all Api controllers
[ApiController]
[Route("api/[controller]")]
public class ApiController : ControllerBase
{

}