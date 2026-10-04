const form = document.getElementById("checkInForm");
const nameInput = document.getElementById("attendeeName");
const teamSelect = document.getElementById("teamSelect");
const attendeeCount = document.getElementById("attendeeCount");
const progressBar = document.getElementById("progressBar");
const greeting = document.getElementById("greeting");
const statusNotice = document.getElementById("statusNotice");
const attendeeList = document.getElementById("attendeeList");
const celebration = document.getElementById("celebration");
const celebrationMessage = document.getElementById("celebrationMessage");
const checkInButton = document.getElementById("checkInBtn");

const maxCount = 50;
const isConfigured =
  typeof supabaseUrl === "string" &&
  supabaseUrl.startsWith("https://") &&
  !supabaseUrl.includes("YOUR_SUPABASE") &&
  typeof supabaseAnonKey === "string" &&
  !supabaseAnonKey.includes("YOUR_SUPABASE");
const teamNames = {
  water: "Team Water Wise",
  zero: "Team Net Zero",
  power: "Team Renewables"
};
let attendees = [];
let isLoading = true;
let isRefreshing = false;
let isSubmitting = false;

function showStatusNotice(message) {
  statusNotice.textContent = message;
  statusNotice.hidden = false;
}

function clearStatusNotice() {
  statusNotice.textContent = "";
  statusNotice.hidden = true;
}

function getHeaders() {
  return {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${supabaseAnonKey}`,
    "Content-Type": "application/json"
  };
}

function updateCounters() {
  const teamCounts = {
    water: 0,
    zero: 0,
    power: 0
  };

  attendeeCount.textContent = attendees.length;

  for (let index = 0; index < attendees.length; index++) {
    const attendee = attendees[index];
    teamCounts[attendee.team]++;
  }

  const teams = Object.keys(teamCounts);

  for (let index = 0; index < teams.length; index++) {
    const team = teams[index];
    const teamCounter = document.getElementById(`${team}Count`);
    teamCounter.textContent = teamCounts[team];
  }

  const completedPercentage = Math.min((attendees.length / maxCount) * 100, 100);
  progressBar.style.width = `${completedPercentage}%`;
  progressBar.setAttribute("aria-valuenow", Math.min(attendees.length, maxCount));
  checkInButton.disabled =
    !isConfigured || isLoading || isSubmitting || attendees.length >= maxCount;

  if (attendees.length >= maxCount) {
    showCelebration(teamCounts);
  } else {
    celebration.hidden = true;
  }
}

function updateAttendeeList() {
  attendeeList.textContent = "";

  if (attendees.length === 0) {
    const emptyMessage = document.createElement("li");
    emptyMessage.className = "attendee-empty";
    emptyMessage.textContent = "No attendees have checked in yet.";
    attendeeList.appendChild(emptyMessage);
    return;
  }

  for (let index = 0; index < attendees.length; index++) {
    const attendee = attendees[index];
    const attendeeItem = document.createElement("li");
    attendeeItem.textContent = `${attendee.name} — ${teamNames[attendee.team]}`;
    attendeeList.appendChild(attendeeItem);
  }
}

function showCelebration(teamCounts) {
  let highestTeamCount = 0;
  const winningTeams = [];
  const teams = Object.keys(teamCounts);

  for (let index = 0; index < teams.length; index++) {
    const team = teams[index];

    if (teamCounts[team] > highestTeamCount) {
      highestTeamCount = teamCounts[team];
      winningTeams.length = 0;
      winningTeams.push(teamNames[team]);
    } else if (teamCounts[team] === highestTeamCount) {
      winningTeams.push(teamNames[team]);
    }
  }

  if (winningTeams.length === 1) {
    celebrationMessage.textContent =
      `${winningTeams[0]} is the winning team with ${highestTeamCount} attendees!`;
  } else {
    celebrationMessage.textContent =
      `${winningTeams.join(", ")} are tied as the winning teams with ${highestTeamCount} attendees each!`;
  }

  celebration.hidden = false;
}

function isValidAttendee(attendee) {
  return (
    attendee &&
    typeof attendee.name === "string" &&
    Object.prototype.hasOwnProperty.call(teamNames, attendee.team)
  );
}

async function loadAttendance(showErrors) {
  if (isRefreshing) {
    return;
  }

  isRefreshing = true;

  try {
    const response = await fetch(
      `${supabaseUrl.replace(/\/+$/, "")}/rest/v1/attendees?select=id,name,team,created_at&order=created_at.asc,id.asc`,
      {
        headers: getHeaders()
      }
    );

    if (!response.ok) {
      const errorDetails = await response.text();
      throw new Error(`Supabase returned ${response.status}: ${errorDetails}`);
    }

    const savedAttendees = await response.json();

    if (
      !Array.isArray(savedAttendees) ||
      savedAttendees.length > maxCount
    ) {
      throw new Error("The saved attendance data has an invalid format.");
    }

    for (let index = 0; index < savedAttendees.length; index++) {
      if (!isValidAttendee(savedAttendees[index])) {
        throw new Error("The saved attendance data has an invalid attendee.");
      }
    }

    attendees = savedAttendees;
    clearStatusNotice();
    updateCounters();
    updateAttendeeList();
  } catch (error) {
    console.error("Unable to load shared attendance.", error);

    if (showErrors) {
      showStatusNotice(
        "Shared attendance could not be loaded. Check the Supabase setup and your internet connection."
      );
    }
  } finally {
    isRefreshing = false;
    isLoading = false;
    updateCounters();
  }
}

async function checkInAttendee(name, team) {
  const response = await fetch(
    `${supabaseUrl.replace(/\/+$/, "")}/rest/v1/rpc/check_in_attendee`,
    {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        attendee_name: name,
        attendee_team: team
      })
    }
  );

  if (!response.ok) {
    const errorDetails = await response.text();
    throw new Error(`Supabase returned ${response.status}: ${errorDetails}`);
  }

  const insertedAttendees = await response.json();

  if (
    !Array.isArray(insertedAttendees) ||
    insertedAttendees.length !== 1 ||
    !isValidAttendee(insertedAttendees[0])
  ) {
    throw new Error("Supabase returned an invalid check-in response.");
  }

  return insertedAttendees[0];
}

form.addEventListener("submit", async function(event) {
  event.preventDefault();

  if (isLoading || isSubmitting || attendees.length >= maxCount) {
    return;
  }

  const name = nameInput.value.trim();
  const team = teamSelect.value;

  if (name.length === 0) {
    nameInput.setCustomValidity("Please enter an attendee name.");
    nameInput.reportValidity();
    return;
  }

  nameInput.setCustomValidity("");
  isSubmitting = true;
  clearStatusNotice();
  updateCounters();

  try {
    const attendee = await checkInAttendee(name, team);
    attendees.push(attendee);
    updateCounters();
    updateAttendeeList();

    greeting.textContent = `Welcome, ${name} from ${teamNames[team]}!`;
    greeting.className = "success-message";
    greeting.style.display = "block";
    form.reset();
  } catch (error) {
    console.error("Unable to save shared check-in.", error);
    showStatusNotice(
      "Check-in could not be saved. Please check your connection and try again."
    );
  } finally {
    isSubmitting = false;
    updateCounters();
  }
});

updateCounters();
updateAttendeeList();

if (!isConfigured) {
  isLoading = false;
  updateCounters();
  showStatusNotice(
    "Add your Supabase project URL and publishable key in supabase-config.js to enable shared check-ins."
  );
} else {
  loadAttendance(true);
  setInterval(function() {
    loadAttendance(true);
  }, 5000);
}
