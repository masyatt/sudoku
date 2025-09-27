// ===== 유틸 =====
const randOrder = arr => arr.slice().sort(() => Math.random() - 0.5);
const deepCopy = b => b.map(r => r.slice());

// ===== 스도쿠 솔버(백트래킹) =====
function isSafe(board, r, c, n){
  for(let i=0;i<9;i++){ if(board[r][i]===n || board[i][c]===n) return false }
  const rs = r - r%3, cs = c - c%3;
  for(let i=0;i<3;i++) for(let j=0;j<3;j++){ if(board[rs+i][cs+j]===n) return false }
  return true;
}

function solve(board){
  for(let r=0;r<9;r++){
    for(let c=0;c<9;c++){
      if(board[r][c]===0){
        for(const n of randOrder([1,2,3,4,5,6,7,8,9])){
          if(isSafe(board,r,c,n)){
            board[r][c]=n;
            if(solve(board)) return true;
            board[r][c]=0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

function generateSolution(){
  const b = Array.from({length:9},()=>Array(9).fill(0));
  // 첫 행 랜덤 시드
  for(const c of randOrder([0,1,2,3,4,5,6,7,8])){
    const nums = randOrder([1,2,3,4,5,6,7,8,9]);
    for(const n of nums){ if(isSafe(b,0,c,n)){ b[0][c]=n; break } }
  }
  solve(b);
  return b;
}

function generatePuzzle(level){
  const solution = generateSolution();
  const puzzle = deepCopy(solution);
  const remove = level==='easy'? 35 : level==='medium'? 45 : 55; // 지울 칸 수
  let removed = 0, safety = 0;
  while(removed < remove && safety < 400){
    const r = Math.floor(Math.random()*9), c = Math.floor(Math.random()*9);
    if(puzzle[r][c]!==0){ puzzle[r][c]=0; removed++; }
    safety++;
  }
  return { puzzle, solution };
}

// ===== 렌더링 =====
const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
let currentSolution = null; // 2D 배열
let givenMask = null;       // true=고정칸
let activeIndex = null;     // 0..80

function indexOf(rc){ return rc.r*9 + rc.c }
function rcOf(i){ return { r: Math.floor(i/9), c: i%9 } }

function render(puzzle){
  boardEl.innerHTML = '';
  givenMask = puzzle.map(row => row.map(v => v!==0));

  for(let r=0;r<9;r++){
    for(let c=0;c<9;c++){
      const i = indexOf({r,c});
      const wrap = document.createElement('div');
      wrap.className = 'cell';
      if(r%3===0) wrap.classList.add('thick-top');
      if(c%3===0) wrap.classList.add('thick-left');
      if(c===2 || c===5) wrap.classList.add('thick-right');
      if(r===2 || r===5) wrap.classList.add('thick-bottom');
      if(givenMask[r][c]) wrap.classList.add('given');

      const inner = document.createElement('div');
      inner.className = 'cell-inner';

      const input = document.createElement('input');
      input.setAttribute('type','text');
      input.setAttribute('inputmode','numeric');
      input.setAttribute('pattern','[1-9]*');
      input.setAttribute('maxlength','1');
      input.dataset.index = i;
      if(puzzle[r][c]!==0){ input.value = puzzle[r][c]; input.readOnly = true; input.tabIndex = -1 }

      // 입력 제한: 1~9만
      input.addEventListener('beforeinput', (e)=>{
        if(e.data && !/[1-9]/.test(e.data)) e.preventDefault();
      });
      input.addEventListener('input', (e)=>{
        e.target.value = e.target.value.replace(/[^1-9]/g,'').slice(0,1);
        activeIndex = Number(e.target.dataset.index);
        updateHighlights();
      });
      input.addEventListener('focus', (e)=>{ activeIndex = Number(e.target.dataset.index); updateHighlights() });

      inner.appendChild(input);
      wrap.appendChild(inner);
      boardEl.appendChild(wrap);
    }
  }
  activeIndex = null;
  updateHighlights();
}

function updateHighlights(){
  [...boardEl.children].forEach(el=>el.classList.remove('hl'));
  if(activeIndex==null) return;
  const {r,c} = rcOf(activeIndex);
  for(let i=0;i<81;i++){
    const {r:rr,c:cc} = rcOf(i);
    if(rr===r || cc===c || (Math.floor(rr/3)===Math.floor(r/3) && Math.floor(cc/3)===Math.floor(c/3))){
      boardEl.children[i].classList.add('hl');
    }
  }
}

// ===== 게임 로직 =====
function start(level){
  const { puzzle, solution } = generatePuzzle(level);
  currentSolution = solution;
  render(puzzle);
  statusEl.textContent = `난이도: ${level.toUpperCase()} — 새로운 퍼즐이 시작되었습니다.`;
  statusEl.className = 'status';
}

function readUserBoard(){
  const vals = [];
  for(let i=0;i<81;i++){
    const input = boardEl.children[i].querySelector('input');
    vals.push( input.value ? Number(input.value) : 0 );
  }
  // 2D로 변환
  const b = Array.from({length:9},()=>Array(9).fill(0));
  for(let i=0;i<81;i++){ b[Math.floor(i/9)][i%9] = vals[i]; }
  return b;
}

function check(){
  if(!currentSolution){ statusEl.textContent='먼저 새 게임을 시작하세요.'; return; }
  const user = readUserBoard();
  let wrong = 0;
  for(let r=0;r<9;r++){
    for(let c=0;c<9;c++){
      const idx = r*9+c;
      const cellEl = boardEl.children[idx];
      cellEl.classList.remove('error');
      if(user[r][c]!==0 && user[r][c]!==currentSolution[r][c]){
        wrong++;
        cellEl.classList.add('error');
      }
    }
  }
  if(wrong===0){
    statusEl.textContent = '🎉 정답입니다!';
    statusEl.className = 'status good';
  }else{
    statusEl.textContent = `❌ 틀린 칸 ${wrong}개가 있습니다.`;
    statusEl.className = 'status bad';
  }
}

function resetBoard(){
  for(let i=0;i<81;i++){
    const cell = boardEl.children[i];
    const input = cell.querySelector('input');
    if(!input.readOnly){ input.value=''; cell.classList.remove('error') }
  }
  statusEl.textContent = '보드를 초기화했습니다.';
  statusEl.className = 'status';
}

// 가상 키패드
document.querySelectorAll('.keypad button').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    if(activeIndex==null) return;
    const input = boardEl.children[activeIndex].querySelector('input');
    if(input.readOnly) return;
    const key = btn.dataset.key;
    if(key==='del'){ input.value=''; }
    else { input.value = key; }
    updateHighlights();
    input.focus();
  })
})

// 버튼 연결
document.getElementById('btn-new').addEventListener('click', ()=> start(currentLevel));
document.getElementById('btn-check').addEventListener('click', check);
document.getElementById('btn-reset').addEventListener('click', reset);

// 난이도 버튼
let currentLevel = 'easy';
document.querySelectorAll('button[data-level]').forEach(b=>{
  b.addEventListener('click', ()=>{ currentLevel = b.dataset.level; start(currentLevel); })
})

// 초기 시작
start(currentLevel);
