// canvas size defined by radius of game (default 300)
var gameRad = Math.min(1000,window.innerWidth, window.innerHeight/1.5)/2; // fill window

// Create the canvas
var canvas = document.createElement("canvas");
var context = canvas.getContext("2d");
canvas.width = gameRad * 2;
canvas.height = gameRad * 2;
canvas.style.border = "0px";
document.body.appendChild(canvas);

// global variables
var score;
var bestScore;
var lastTime;
var snakeSpeed = 0.8 * gameRad; // scale movement
var player = {
  size: 20 * gameRad / 250, // player width in pixels, scaled
  arcRot: 0, // angle around
  radius: 0, // distance from centre
  radSpeed: 0, // radius speed in pix/sec
  arcSpeed: snakeSpeed, // arc speed in pix/sec (note: independent of radius)
  x: 0,
  y: 0,
  initBodSize: 3, // how many 'bodies' behind head initially
};
var food = {
  size: 20 * gameRad / 250,
  arcRot: 0,
  radius: 0,
  x: 0,
  y: 0,
};
var playerMovement = []; // big array storing position values of player for bodies
var bodArray = [];
var keysDown = {}; // for input
var keysReleased = {}; // 'pre-release' all keys used:
keysReleased[37] = true;
keysReleased[39] = true;
keysReleased[40] = true;
keysReleased[45] = true;

// body constructor function
function SnakeBod(arcRot, radius) {
  this.arcRot = arcRot;
  this.radius = radius;
  this.size = player.size;
  this.x;
  this.y;
}

// A cross-browser requestAnimationFrame
var requestAnimFrame = (function() {
  return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || function(callback) {
    window.setTimeout(callback, 1000 / 60);
  };
})();

// initial function
function init() {
  drawBg();

  reset();

  bestScore = 0;
  // retrieve high score from local storage
  if (typeof(Storage) !== "undefined") {
    if (localStorage.getItem('circSnakeBestScore')) {
      bestScore = localStorage.getItem('circSnakeBestScore');
    }
  }

  lastTime = Date.now();
  main(); // run timer code for main loop
}

function reset() {
  score = 0;

  player.arcRot = 0;
  player.radius = 0.5 * gameRad; // scale init pos
  player.radSpeed = 0;
  player.arcSpeed = snakeSpeed;

  resetFood();

  bodArray = []; // clear array
  playerMovement = [];
  // fill player movement with 'imaginary' movement for initial bods
  var i;
  for (i = 1; i <= bodGap("delay") * player.initBodSize; i++) {
    playerMovement.push([player.arcRot - (bodGap("rad") / bodGap("delay")) * i, player.radius]);
  }

  var i;
  for (i = 1; i <= player.initBodSize; i++) { // add initial bodies
    bodArray.push(new SnakeBod(player.arcRot - bodGap("rad") * i, player.radius));
  }
}

function main() {
  var now = Date.now();
  var dt = (now - lastTime) / 1000; // value used to give pixels/sec

  update(dt); // update positions
  render(); // draw objects

  lastTime = now;
  requestAnimFrame(main);
}

function update(dt) {
  if (Math.abs(player.radius) - player.size / 3 >= gameRad / 8) {
    // change player controls depending on 'quadrants' player is in
    var quadAngle = player.arcRot * 180 / Math.PI; // convert player arc to degrees

    var speedNeg = 1; // for more compact code, sets sign of speed as opposite keys are opposite speeds
    if (37 in keysDown || 39 in keysDown) { // if left or right key pressed
      if (39 in keysDown) speedNeg = -1; // if right key, negate
      if (player.arcSpeed != 0) { // moving along arc
        if (quadAngle < 180) { // on right half
          player.radSpeed = -snakeSpeed * speedNeg;
          player.arcSpeed = 0; // move into radius
        } else { // on left half
          player.radSpeed = snakeSpeed * speedNeg;
          player.arcSpeed = 0; // move out of radius
        }
      } else { // moving along radius
        if (90 < quadAngle && quadAngle < 270) { // on bottom half
          player.radSpeed = 0;
          player.arcSpeed = snakeSpeed * speedNeg;
        } else { // on top half
          player.radSpeed = 0;
          player.arcSpeed = -snakeSpeed * speedNeg;
        }
      }
    } else if (38 in keysDown || 40 in keysDown) { // if up or down key pressed
      if (40 in keysDown) {
        speedNeg = -1;
      } // if down key, negate
      if (player.arcSpeed != 0) { // moving along arc
        if (90 < quadAngle && quadAngle < 270) { // on bottom half
          player.radSpeed = -snakeSpeed * speedNeg;
          player.arcSpeed = 0; // move into radius
        } else { // on top half
          player.radSpeed = snakeSpeed * speedNeg;
          player.arcSpeed = 0; // move out of radius
        }
      } else { // moving along radius        		
        if (quadAngle < 180) { // on right half                    
          player.radSpeed = 0;
          player.arcSpeed = -snakeSpeed * speedNeg;
        } else { // on left half                    
          player.radSpeed = 0;
          player.arcSpeed = snakeSpeed * speedNeg;
        }
      }
    }
  }
  keysDown = {}; // reset keys

  // move player
  player.arcRot += player.arcSpeed * dt / player.radius; // angular speed (rad/sec)
  player.radius += player.radSpeed * dt;

  // update player movement array
  playerMovement.unshift([player.arcRot, player.radius]);

  // move bodies
  moveBodies(dt);

  // keep angles positive between 0-360 degrees
  if (player.arcRot < 0) {
    player.arcRot += Math.PI * 2;
  } else if (player.arcRot > Math.PI * 2) {
    player.arcRot -= Math.PI * 2;
  }

  // collision with food
  if (circleCollision(player, food)) {
    resetFood();
    score++;
    if (score > bestScore) {
      bestScore++;
      // local storage of high score
      if (typeof(Storage) !== "undefined") {
        localStorage.setItem('circSnakeBestScore', bestScore); // save best locally
      }
    }

    // add new body in position of tail
    bodArray.push(new SnakeBod(bodArray[bodArray.length - 1].arcRot,
      bodArray[bodArray.length - 1].radius));
  }

  // reset?
  if (Math.abs(player.radius) > gameRad - player.size / 2) {
    reset();
  }
  var i;
  for (i = 1; i < bodArray.length; i++) { // start from 1 as often hits its own 'neck'
    if (circleCollision(player, bodArray[i])) { // if snake hits itself, approximate collsion using circle
      reset();
      break;
    }
  }
}

// reset food function to make it doesn't land on player
function resetFood() {
  food.arcRot = Math.random() * Math.PI * 2; // reset food position
  food.radius = Math.random() * gameRad * 0.96; // take into scaling and size of food
  // calc x and y
  food.x = gameRad + food.radius * Math.sin(food.arcRot);
  food.y = gameRad - food.radius * Math.cos(food.arcRot);

  if (circleCollision(player, food)) {
    resetFood();
  }
  var i;
  for (i = 0; i < bodArray.length; i++) {
    if (circleCollision(bodArray[i], food)) {
      resetFood();
      break;
    }
  }
}

// tricky function to move the bodies around
function moveBodies(dt) {
  var i;
  for (i = 1; i <= bodArray.length; i++) {
    var bod = bodArray[i - 1];

    // update body positions from big player movement array
    if (playerMovement.length > i * bodGap("delay")) {
      bod.arcRot = playerMovement[i * bodGap("delay")][0];
      bod.radius = playerMovement[i * bodGap("delay")][1];
    }
  }
  while (playerMovement.length > bodArray.length * bodGap("delay")) {
    playerMovement.pop(); // remove last element
  }
}

// calculate gap distance between body in radians (dependent on radius)
function bodGap(unit) {
  if (unit == "rad") {
    return player.size * 1.2 / player.radius;
  } else if (unit == "pix") {
    return player.size * 1.2;
  } else if (unit == "delay") {
    return Math.round((player.size * 1.2 / snakeSpeed) * 60); // scale body delay
  }
}

// keyboard inputs
var inputKeys = {37: 1, 38: 1, 39: 1, 40: 1};
addEventListener("keydown", function(e) {
  if (keysReleased[e.keyCode]) { // only let key be pressed if already released
    keysDown[e.keyCode] = true;
    keysReleased[e.keyCode] = false;
  }
  if (inputKeys[e.keyCode]){
	  e.preventDefault(); // stop scrolling if arrow keys pressed
  }
}, false);
addEventListener("keyup", function(e) {
  keysReleased[e.keyCode] = true;
}, false);
// touch inputs
var touchX;
var touchY;
addEventListener("touchstart", function(e) {
  touchX = e.changedTouches[0].pageX;
  touchY = e.changedTouches[0].pageY;
  if (touchX < gameRad*2 && touchY < gameRad*2.2) { // if touch is on game
	  e.preventDefault(); // stop page scrolling
  }
}, false);
addEventListener("touchend", function(e) {
  var diffX = touchX - e.changedTouches[0].pageX;
  var diffY = touchY - e.changedTouches[0].pageY;
  if (Math.abs(diffX) > Math.abs(diffY)) { // horiz swipe
    if (diffX > 0) { // left swipe
      keysDown[37] = true;
    } else { // right swipe
      keysDown[39] = true;
    }
  } else { // vert swipe
    if (diffY > 0) { // up
      keysDown[38] = true;
    } else { // down
      keysDown[40] = true;
    }
  }
}, false);


function render() {
  // clear previous render
  context.fillStyle = "#8EB268";
  context.fillRect(0, 0, canvas.width, canvas.height);

  drawBg();

  // draw main player
  player.x = gameRad + player.radius * Math.sin(player.arcRot);
  player.y = gameRad - player.radius * Math.cos(player.arcRot);
  drawBox(player.x, player.y, -player.arcRot, "black", player.size);

  // draw snake's body 
  var i;
  for (i = 0; i < bodArray.length; i++) {
    var bod = bodArray[i];
    bod.x = gameRad + bod.radius * Math.sin(bod.arcRot);
    bod.y = gameRad - bod.radius * Math.cos(bod.arcRot);
    drawBox(bod.x, bod.y, -bod.arcRot, "black", player.size);
  }

  // draw food
  var foodWidth = Math.max(1, 8 * gameRad / 300); // scale food size
  context.beginPath();
  context.lineWidth = foodWidth;
  context.strokeStyle = 'black';
  context.arc(food.x, food.y, food.size / 2 - foodWidth / 2, 0, 2 * Math.PI); // parameters (x, y, radius, ..)
  context.stroke();

  // lastly, score
  context.fillStyle = "black";
  context.font = Math.round(0.06 * gameRad) + "px Tahoma"; // scale font size
  context.textAlign = "left";
  context.textBaseline = "top";
  context.fillText("SCORE: " + score, 0.07 * gameRad, 0.07 * gameRad);
  context.fillText("BEST: " + bestScore, 1.6 * gameRad, 0.07 * gameRad);
}

function drawBox(x, y, rot, color, size) { // rot in radians
  context.fillStyle = color;
  context.beginPath();

  var i;

  // create a 2x4 array of box's 4 x,y coordinates
  var coords = getBoxCorners(x, y, rot, size);

  context.moveTo(coords[0][0], coords[0][1]);
  for (i = 1; i < 4; i++) {
    context.lineTo(coords[i][0], coords[i][1]);
  }
  context.closePath();
  context.fill();
}

function drawBg() {
  context.fillStyle = '#8EB268';
  var i;
  var switcher = 0;
  for (i = gameRad; i >= 0; i -= gameRad / 8) {
    context.beginPath();
    context.arc(gameRad, gameRad, i, 0, 2 * Math.PI); // parameters (x, y, radius, ..)        
    if (switcher == 0) {
      context.fillStyle = '#B7D4A8';
      switcher = 1;
    } else {
      context.fillStyle = '#8EB268';
      switcher = 0;
    }
    context.fill();
  }
  context.beginPath();
  context.arc(gameRad, gameRad, gameRad, 0, 2 * Math.PI); // boundary
  context.lineWidth = Math.max(1, 2 * gameRad / 300);
  context.strokeStyle = 'black';
  context.stroke();

  // additional cirle if player is in middle
  if (Math.abs(player.radius) - player.size / 3 < gameRad / 8) {
    context.beginPath();
    context.arc(gameRad, gameRad, gameRad / 8, 0, 2 * Math.PI);
    context.fillStyle = '#37391B';
    context.fill();
  }
}

function getBoxCorners(x, y, rot, size) {
  var coords = [
    [-(size / 2), -(size / 2)], // top left
    [(size / 2), -(size / 2)], // top right
    [(size / 2), (size / 2)], // bottom right
    [-(size / 2), (size / 2)] // bottom left
  ];

  // apply 2D CW rotation matrix
  var i;
  for (i = 0; i < 4; i++) { // loop through four coordinates
    var origX = coords[i][0]; // don't loose original x as modified first
    coords[i][0] = coords[i][0] * Math.cos(rot) + coords[i][1] * Math.sin(rot) + x;
    coords[i][1] = -origX * Math.sin(rot) + coords[i][1] * Math.cos(rot) + y;
  }

  return coords;
}

function circleCollision(box, circle) {
  // check corners and centre of box within circle       
  var corners = getBoxCorners(box.x, box.y, -box.arcRot, box.size);
  if (pointInCircle(corners[0][0], corners[0][1], circle.x, circle.y, circle.size / 2) || pointInCircle(corners[1][0], corners[1][1], circle.x, circle.y, circle.size / 2) || pointInCircle(corners[2][0], corners[2][1], circle.x, circle.y, circle.size / 2) || pointInCircle(corners[3][0], corners[3][1], circle.x, circle.y, circle.size / 2) || pointInCircle(box.x, box.y, circle.x, circle.y, circle.size / 2)) {
    return true;
  }
  return false;
}

function pointInCircle(x, y, c_x, c_y, radius) {
  // use polar coordinates to determine if radius of point is < circle radius
  if (Math.sqrt(Math.pow(x - c_x, 2) + Math.pow(y - c_y, 2)) < radius) {
    return true;
  }
  return false;
}

init(); // let's start!
