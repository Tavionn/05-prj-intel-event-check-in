const form = document.getElementById("checkInForm");
const nameInput = document.getElementById("attendeeName");
const teamSelect = document.getElementById("teamSelect");
const attendeeCount = document.getElementById("attendeeCount");
const progressBar = document.getElementById("progressBar");
const greeting = document.getElementById("greeting");
const statusNotice = document.getElementById("statusNotice");
const localModeNotice = document.getElementById("localModeNotice");
const attendeeList = document.getElementById("attendeeList");
const celebration = document.getElementById("celebration");
const celebrationMessage = document.getElementById("celebrationMessage");
const checkInButton = document.getElementById("checkInBtn");
const resetFormButton = document.getElementById("resetFormBtn");

const maxCount = 50;
const localAttendanceKey = "intel-sustainability-summit-attendees";
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
let localStorageReady = true;

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
    isLoading ||
    isSubmitting ||
    (!isConfigured && !localStorageReady) ||
    attendees.length >= maxCount;

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

function loadLocalAttendance() {
  try {
    const savedAttendance = localStorage.getItem(localAttendanceKey);

    if (savedAttendance !== null) {
      const savedAttendees = JSON.parse(savedAttendance);

      if (!Array.isArray(savedAttendees) || savedAttendees.length > maxCount) {
        throw new Error("The saved local attendance data has an invalid format.");
      }

      for (let index = 0; index < savedAttendees.length; index++) {
        const attendee = savedAttendees[index];

        if (
          !isValidAttendee(attendee) ||
          attendee.name.trim().length === 0 ||
          attendee.name.length > 120
        ) {
          throw new Error("The saved local attendance data has an invalid attendee.");
        }
      }

      attendees = savedAttendees;
    }

    localStorageReady = true;
    updateCounters();
    updateAttendeeList();
  } catch (error) {
    localStorageReady = false;
    console.error("Unable to load local attendance.", error);
    showStatusNotice(
      "Local attendance could not be loaded from this browser. Check browser storage and refresh the page."
    );
  } finally {
    isLoading = false;
    updateCounters();
  }
}

function saveLocalAttendee(name, team) {
  const attendee = {
    name: name,
    team: team
  };
  const updatedAttendees = attendees.concat(attendee);

  localStorage.setItem(localAttendanceKey, JSON.stringify(updatedAttendees));
  return attendee;
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
    const attendee = isConfigured
      ? await checkInAttendee(name, team)
      : saveLocalAttendee(name, team);
    attendees.push(attendee);
    updateCounters();
    updateAttendeeList();

    greeting.textContent = `Welcome, ${name} from ${teamNames[team]}!`;
    greeting.className = "success-message";
    greeting.style.display = "block";
    form.reset();
  } catch (error) {
    console.error("Unable to save check-in.", error);

    if (isConfigured) {
      showStatusNotice(
        "Check-in could not be saved. Please check your connection and try again."
      );
    } else {
      localStorageReady = false;
      showStatusNotice(
        "Check-in could not be saved in this browser. Check available browser storage and try again."
      );
    }
  } finally {
    isSubmitting = false;
    updateCounters();
  }
});

resetFormButton.addEventListener("click", function() {
  form.reset();
  nameInput.setCustomValidity("");
  greeting.textContent = "";
  greeting.className = "";
  greeting.style.display = "none";

  if (isConfigured) {
    showStatusNotice(
      "Shared attendance cannot be cleared from this browser-only reset button."
    );
    return;
  }

  try {
    localStorage.removeItem(localAttendanceKey);
    attendees = [];
    localStorageReady = true;
    clearStatusNotice();
    updateCounters();
    updateAttendeeList();
  } catch (error) {
    console.error("Unable to reset local attendance.", error);
    showStatusNotice(
      "Attendance could not be reset in this browser. Check browser storage and try again."
    );
  }
});

updateCounters();
updateAttendeeList();

if (!isConfigured) {
  localModeNotice.hidden = false;
  loadLocalAttendance();
} else {
  loadAttendance(true);
  setInterval(function() {
    loadAttendance(true);
  }, 5000);
}
