namespace Server.Models.PeopleLookup;

public class PeopleSearchResult
{
    public string? SearchValue { get; set; }

    public bool Found { get; set; }

    public string? FullName { get; set; }

    public string? OfficialFullName { get; set; }

    public string? FirstName { get; set; }

    public string? LastName { get; set; }

    public string? Pronouns { get; set; }

    public string? KerbId { get; set; }

    public string? IamId { get; set; }

    public string? Email { get; set; }

    public string? OtherEmails { get; set; }

    public bool IsEmployee { get; set; }

    public bool IsHsEmployee { get; set; }

    public bool IsFaculty { get; set; }

    public bool IsStudent { get; set; }

    public bool IsExternal { get; set; }

    public bool IsStaff { get; set; }

    public string? PpsId { get; set; }

    public string? StudentId { get; set; }

    public string? BannerPidm { get; set; }

    public string? EmployeeId { get; set; }

    public string? MothraId { get; set; }

    public string? Title { get; set; }

    public string? ReportsToIamId { get; set; }

    public string? WorkPhone { get; set; }

    public string? ExpandedAffiliation
    {
        get
        {
            var roles = new List<string>();

            if (IsStaff) { roles.Add("Staff"); }
            if (IsFaculty) { roles.Add("Faculty"); }
            if (IsStudent) { roles.Add("Student"); }

            return string.Join(", ", roles);
        }
    }

    public string? Departments { get; set; }

    public string? ErrorMessage { get; set; }

    public string? ExceptionMessage { get; set; }

    public void HideSensitiveFields()
    {
        StudentId = null;
        BannerPidm = null;
        PpsId = null;
        EmployeeId = null;
        ExceptionMessage = null;
        ReportsToIamId = null;
        MothraId = null;
        OfficialFullName = null;
        OtherEmails = null;
    }
}
