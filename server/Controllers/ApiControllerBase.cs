using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Server.Controllers;

// base controller for all Api controllers
[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ApiControllerBase : ControllerBase
{

}