import { getSpeech } from './data.js';
export function question(word,language) {
  const speech=word.letterName?{language,text:language==='ko'?`${word.category==='uppercase'?'대문자':'소문자'} ${word.letterName}`:`${word.category==='uppercase'?'uppercase':'lowercase'} ${word.speechText}`}:getSpeech(word,language);
  const last=speech.text.charCodeAt(speech.text.length-1);
  const particle=last>=0xAC00&&last<=0xD7A3&&(last-0xAC00)%28!==0?'을':'를';
  return {...speech,text:speech.language==='ko'?`${speech.text}${particle} 찾아보세요!`:`Find ${word.letterName?speech.text:speech.text.toLowerCase()}!`,file:`find-${word.id}`};
}
export function feedback(correct,language){return {language,file:correct?'correct':'retry',text:language==='ko'?(correct?'맞았어요! 참 잘했어요!':'다시 찾아볼까요?'):(correct?'You found it! Well done!':'Let’s try again!')};}
export function nextTarget(items,seen,previous){
  let available=items.filter(w=>!seen.has(w.id));
  if(!available.length){seen.clear();available=items.filter(w=>w.id!==previous);}
  const target=available[Math.floor(Math.random()*available.length)]||items[0];
  seen.add(target.id);return target;
}
