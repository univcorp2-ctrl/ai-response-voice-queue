const samples=[
  {platform:"ChatGPT",title:"実装案が完成しました",text:"ブラウザ拡張のサービスワーカーで複数タブの回答を一つのキューにまとめ、順番に読み上げる構成がおすすめです。"},
  {platform:"Claude",title:"レビュー結果",text:"読み上げが他の作業と重ならないよう、ユーザー操作後の待機時間と、音声再生中タブの検出を組み合わせています。"},
  {platform:"Codex",title:"テスト完了",text:"重複排除、優先順位、長文整形のテストが完了しました。GitHub Actionsから拡張機能の成果物を取得できます。"},
];
const queue=[];let busy=false;let speaking=false;
const list=document.querySelector("#queue"),notice=document.querySelector("#notice"),orbState=document.querySelector("#orbState"),orb=document.querySelector(".orb");

document.querySelector("#addSamples").addEventListener("click",()=>{queue.push(...samples.map((item,index)=>({...item,id:Date.now()+index})));render();});
document.querySelector("#toggleBusy").addEventListener("click",(event)=>{busy=!busy;event.currentTarget.textContent=busy?"操作中を解除":"操作中を再現";notice.textContent=busy?"キーボード入力中と判断し、読み上げを待機しています。":"操作が止まりました。次の回答を読み上げられます。";render();});
document.querySelector("#speakNext").addEventListener("click",speakNext);
document.querySelector("#stop").addEventListener("click",()=>{speechSynthesis.cancel();speaking=false;render();});

function speakNext(){
  if(busy){notice.textContent="操作中のため読み上げを保留しました。";return;}
  if(!queue.length||speaking)return;
  const item=queue.shift();
  const utterance=new SpeechSynthesisUtterance(`${item.platform} の回答です。${item.text}`);
  utterance.lang="ja-JP";utterance.rate=1.05;speaking=true;
  utterance.onend=utterance.onerror=()=>{speaking=false;render();};
  speechSynthesis.speak(utterance);render();
}

function render(){
  list.innerHTML="";
  queue.forEach((item,index)=>{const row=document.createElement("li");row.innerHTML=`<span class="index">${String(index+1).padStart(2,"0")}</span><div><small>${item.platform}</small><strong>${item.title}</strong><p>${item.text}</p></div>`;list.append(row);});
  if(!queue.length&&!speaking)notice.textContent="キューは空です。新しい回答を待っています。";
  orbState.textContent=speaking?"読み上げ中":busy?"操作中・待機":"待機中";
  orb.classList.toggle("speaking",speaking);
}
render();
