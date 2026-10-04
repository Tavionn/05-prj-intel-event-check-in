const form = document.getElementById("checkInForm");
const nameInput = document.getElementById("attendeeName");
const teamSelect = document.getElementById("teamSelect");
const attendeeCount = document.getElementById("attendeeCount");
const progressBar = document.getElementById("progressBar");
const greeting = document.getElementById("greeting");
const storageNotice = document.getElementById("storageNotice");
const attendeeList = document.getElementById("attendeeList");
const celebration = document.getElementById("celebration");
const celebrationMessage = document.getElementById("celebrationMessage");
const checkInButton = document.getElementById("checkInBtn");

let count = 0;
const maxCount = 50;
const storageKey = "intelSummitAttendance";
const teamNames = {
  water: "Team Water Wise",
  zero: "Team Net Zero",
  power: "Team Renewables"
};
let teamCounts = {
  water: 0,
  zero: 0,
  power: 0
};
let attendees = [];

function showStorageNotice(message) {
  storageNotice.textContent = message;
  storageNotice.hidden = false;
}

function isValidProgress(progress) {
  const teams = Object.keys(teamNames);

  if (
    !progress ||
    !Number.isInteger(progress.count) ||
    progress.count < 0 ||
    progress.count > maxCount ||
    !progress.teamCounts ||
    !Array.isArray(progress.attendees)
  ) {
    return false;
  }

  for (let index = 0; index < teams.length; index++) {
    const team = teams[index];

    if (
      !Number.isInteger(progress.teamCounts[team]) ||
      progress.teamCounts[team] < 0
    ) {
      return false;
    }
  }

  for (let index = 0; index < progress.attendees.length; index++) {
    const attendee = progress.attendees[index];

    if (
      !attendee ||
      typeof attendee.name !== "string" ||
      !teams.includes(attendee.team)
    ) {
      return false;
    }
  }

  return true;
}

function loadProgress() {
  let savedProgress;

  try {
    savedProgress = localStorage.getItem(storageKey);
  } catch (error) {
    console.error("Unable to read saved attendance from local storage.", error);
    showStorageNotice("Saved attendance could not be read in this browser.");
    return;
  }

  if (!savedProgress) {
    return;
  }

  try {
    const progress = JSON.parse(savedProgress);

    if (!isValidProgress(progress)) {
      throw new Error("Saved attendance data has an invalid format.");
    }

    count = progress.count;
    teamCounts = progress.teamCounts;
    attendees = progress.attendees;
  } catch (error) {
    console.error("Unable to load saved attendance.", error);
    showStorageNotice("Saved attendance is invalid and could not be loaded.");
  }
}

function saveProgress() {
  const progress = {
    count: count,
    teamCounts: teamCounts,
    attendees: attendees
  };

  try {
    localStorage.setItem(storageKey, JSON.stringify(progress));
  } catch (error) {
    console.error("Unable to save attendance to local storage.", error);
    showStorageNotice("Attendance could not be saved in this browser.");
  }
}

function updateCounters() {
  attendeeCount.textContent = count;

  const teams = Object.keys(teamCounts);

  for (let index = 0; index < teams.length; index++) {
    const team = teams[index];
    const teamCounter = document.getElementById(`${team}Count`);
    teamCounter.textContent = teamCounts[team];
  }

  const completedPercentage = Math.min((count / maxCount) * 100, 100);
  progressBar.style.width = `${completedPercentage}%`;
  progressBar.setAttribute("aria-valuenow", Math.min(count, maxCount));
  checkInButton.disabled = count >= maxCount;
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

function showCelebration() {
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

loadProgress();
updateCounters();
updateAttendeeList();

if (count >= maxCount) {
  showCelebration();
}

form.addEventListener("submit", function(event) {
    event.preventDefault();

    if (count >= maxCount) {
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
    count++;
    teamCounts[team]++;
    attendees.push({
      name: name,
      team: team
    });

    updateCounters();
    updateAttendeeList();
    saveProgress();

    greeting.textContent = `Welcome, ${name} from ${teamNames[team]}!`;
    greeting.className = "success-message";
    greeting.style.display = "block";
    form.reset();

    if (count >= maxCount) {
      showCelebration();
    }
});