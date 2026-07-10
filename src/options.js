const DEFAULTS={enabled:true,rate:1.05,pitch:1,volume:1,voiceName:"",maxChars:1400,inactivityDelayMs:4500,minGapMs:900,pauseForOtherAudio:true,announceSource:true};
const ids=["voiceName","rate","pitch","volume","maxChars","pauseForOtherAudio","announceSource"];

async function load(){
  const {settings={}}=await chrome.storage.local.get("settings");
  const value={...DEFAULTS,...settings};
  await loadVoices(value.voiceName);
  for(const id of ids){const element=document.querySelector(`#${id}`);element[element.type==="checkbox"?"checked":"value"]=value[id];}
  document.querySelector("#inactivityDelaySeconds").value=value.inactivityDelayMs/1000;
  document.querySelector("#minGapSeconds").value=value.minGapMs/1000;
  updateOutputs();
}

function loadVoices(selected){
  return new Promise((resolve)=>chrome.tts.getVoices((voices)=>{
    const select=document.querySelector("#voiceName");
    for(const voice of voices){const option=document.createElement("option");option.value=voice.voiceName;option.textContent=`${voice.voiceName}${voice.lang?` (${voice.lang})`:""}`;select.append(option);}
    select.value=selected||"";resolve();
  }));
}

function updateOutputs(){for(const id of ["rate","pitch","volume"]){document.querySelector(`#${id}Value`).textContent=document.querySelector(`#${id}`).value;}}
for(const id of ["rate","pitch","volume"]){document.querySelector(`#${id}`).addEventListener("input",updateOutputs);}

document.querySelector("#form").addEventListener("submit",async(event)=>{
  event.preventDefault();
  const settings={
    ...(await chrome.storage.local.get("settings")).settings,
    voiceName:document.querySelector("#voiceName").value,
    rate:Number(document.querySelector("#rate").value),
    pitch:Number(document.querySelector("#pitch").value),
    volume:Number(document.querySelector("#volume").value),
    maxChars:Number(document.querySelector("#maxChars").value),
    inactivityDelayMs:Number(document.querySelector("#inactivityDelaySeconds").value)*1000,
    minGapMs:Number(document.querySelector("#minGapSeconds").value)*1000,
    pauseForOtherAudio:document.querySelector("#pauseForOtherAudio").checked,
    announceSource:document.querySelector("#announceSource").checked,
  };
  await chrome.storage.local.set({settings});
  const saved=document.querySelector("#saved");saved.textContent="保存しました";setTimeout(()=>saved.textContent="",1800);
});
void load();
