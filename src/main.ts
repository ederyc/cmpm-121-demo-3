// todo add button element that the user can click to see a message
const button = document.createElement("button");
button.textContent = "Click Me! Click Me!";
document.body.appendChild(button);

function displayMessage() {
  alert("You look AMAZING today!");
}

button.addEventListener("click", displayMessage);
