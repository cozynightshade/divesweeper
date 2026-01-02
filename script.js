
let WIDTH = 9, HEIGHT = 9, MINES = 10;
let board = [], revealed = [], flagged = [];
let gameOver = false, firstClick = true;
let timer = null, seconds = 0;

let extraLapsEnabled = true;
let lapActive = false;
let lapsTotal = 2;
let lapsCurrent = 1;

let playerName = "";
let deaths = [];

const face = document.getElementById("face");
const music = document.getElementById("music");
const gameoverDiv = document.getElementById("gameover");
const creditsOverlay = document.getElementById("creditsOverlay");
const lapPopup = document.getElementById("lapPopup");
const lapPopupText = lapPopup.querySelector("div");

if(localStorage.getItem("playerName")) playerName = localStorage.getItem("playerName");
else playerName = prompt("Enter your name:") || "Player";
localStorage.setItem("playerName", playerName);

if(localStorage.getItem("deaths")) deaths = JSON.parse(localStorage.getItem("deaths"));

function playMusic(state){
    try {
        switch(state){
            case "before": music.src="assets/sfx/beforestart.mp3"; break;
            case "ingame": music.src="assets/sfx/ingame.mp3"; break;
            case "lap2": music.src="assets/sfx/lap2.mp3"; break;
            case "after": music.src="assets/sfx/aftergame.mp3"; break;
        }
        music.play();
    } catch(e) { console.log("Audio blocked:", e); }
}

face.onclick = ()=> initGame();
function setFace(type){ face.style.backgroundImage = `var(--face-${type})`; }

function toggleExtraLaps(){
    extraLapsEnabled = !extraLapsEnabled;
    document.getElementById("extraLapsToggle").textContent = "Extra Laps: " + (extraLapsEnabled ? "ON":"OFF");
}

function setDifficulty(w,h,m){
    WIDTH=w; HEIGHT=h; MINES=m;
    initGame();
}

function showCredits(){ creditsOverlay.style.display="flex"; }
function closeCredits(){ creditsOverlay.style.display="none"; }

function initGame(){
    board = Array(WIDTH*HEIGHT).fill(0);
    revealed = Array(WIDTH*HEIGHT).fill(false);
    flagged = Array(WIDTH*HEIGHT).fill(false);
    gameOver = false;
    firstClick = true;
    setFace("happy");
    drawBoard();
    updateCounters();
    gameoverDiv.style.display="none";

    if(!lapActive) playMusic("before");
}

function updateCounters(){
    document.getElementById("mineCounter").textContent = String(MINES - flagged.filter(f=>f).length).padStart(3,"0");
    document.getElementById("timeCounter").textContent = String(seconds).padStart(3,"0");
}

function startTimer(){
    if(timer) return;
    timer = setInterval(()=>{ seconds++; updateCounters(); },1000);
}

function placeMines(safe){
    let placed=0;
    while(placed<MINES){
        const i=Math.floor(Math.random()*board.length);
        if(board[i]===0 && i!==safe){ board[i]=-1; placed++; }
    }
    board.forEach((_,i)=>{
        if(board[i]!==-1) board[i]=neighbors(i).filter(n=>board[n]===-1).length;
    });
}

function neighbors(i){
    const x=i%WIDTH, y=Math.floor(i/WIDTH);
    const n=[];
    for(let dy=-1;dy<=1;dy++)
        for(let dx=-1;dx<=1;dx++){
            if(dx===0 && dy===0) continue;
            const nx=x+dx, ny=y+dy;
            if(nx>=0 && ny>=0 && nx<WIDTH && ny<HEIGHT) n.push(ny*WIDTH+nx);
        }
    return n;
}

function drawBoard(){
    const b = document.getElementById("board");
    b.style.gridTemplateColumns = `repeat(${WIDTH}, var(--tile-size))`;
    b.innerHTML = "";
    board.forEach((_,i)=>{
        const t = document.createElement("div");
        t.className = "tile";

        if(revealed[i]){
            t.classList.add("revealed");
            if(board[i]===-1) t.classList.add("mine");
            else if(board[i]>0){ t.textContent=board[i]; t.classList.add("n"+board[i]); }
        }
        if(flagged[i] && !revealed[i]) t.classList.add("flag");

        t.onmousedown = ()=>{ if(!gameOver&&!revealed[i]){ t.classList.add("pressed"); setFace("pressed"); } };
        t.onmouseup = ()=>{ if(!gameOver&&!revealed[i]){ t.classList.remove("pressed"); setFace("happy"); } };
        t.onmouseleave = ()=>{ if(!gameOver&&!revealed[i]){ t.classList.remove("pressed"); setFace("happy"); } };

        t.onclick = ()=> revealTile(i);
        t.oncontextmenu = e=>{ e.preventDefault(); if(!revealed[i]&&!gameOver&&!firstClick){ flagged[i]=!flagged[i]; updateCounters(); drawBoard(); } };

        b.appendChild(t);
    });
}

function revealTile(i){
    if(revealed[i] || flagged[i] || gameOver) return;

    if(firstClick){
        placeMines(i);
        startTimer();
        firstClick=false;
        if(!lapActive) playMusic("ingame");
    }

    revealed[i] = true;

    if(board[i]===-1){
        gameOver=true;
        clearInterval(timer);
        setFace("dead");
        board.forEach((v,j)=>v===-1&&(revealed[j]=true));
        playMusic("after");

        deaths.push({enemy:"Mine", lap:lapsCurrent});
        localStorage.setItem("deaths", JSON.stringify(deaths));

        lapActive = false;

        const overlay = document.createElement("div");
        overlay.style.position="fixed";
        overlay.style.top=0;
        overlay.style.left=0;
        overlay.style.width="100vw";
        overlay.style.height="100vh";
        overlay.style.backgroundColor="black";
        overlay.style.display="flex";
        overlay.style.alignItems="center";
        overlay.style.justifyContent="center";
        overlay.style.zIndex=9999;

        const msg = document.createElement("div");
        msg.textContent = `You died to... Mine`;
        msg.style.color = "white";
        msg.style.fontFamily = '"MS Sans Serif","Fixedsys",monospace';
        msg.style.fontSize = "48px";
        msg.style.transform = "scale(0)";
        msg.style.transition = "transform 0.5s ease-out";
        overlay.appendChild(msg);
        document.body.appendChild(overlay);

        requestAnimationFrame(()=>{ requestAnimationFrame(()=>{ msg.style.transform="scale(1)"; }); });
        setTimeout(()=>{ overlay.remove(); }, 3000);
    }

    if(board[i]===0) neighbors(i).forEach(revealTile);

    checkWin();
    drawBoard();
}

function checkWin(){
    if(gameOver) return;
    if(board.every((v,i)=>v===-1||revealed[i])){
        gameOver=true;
        clearInterval(timer);
        setFace("cool");
        playMusic("after");

        if(extraLapsEnabled && lapsCurrent < lapsTotal){
            lapActive = true;
            lapsCurrent++;

            lapPopupText.textContent = `${playerName} has completed the minefield, ${lapsTotal - lapsCurrent +1} more lap(s) to go!`;
            lapPopup.style.display="flex";
            setTimeout(()=>{ lapPopup.style.display="none"; },4000);

            setTimeout(()=>{
                initGame();
                playMusic("lap2");
            }, 500);
        }
    }
}

initGame();
