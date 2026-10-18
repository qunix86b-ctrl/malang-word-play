export const categories = [
  {id:'animals', label:'동물', en:'Animals', icon:'🐻', color:'#e3f1e8', subtitle:'어떤 동물 친구를 만나 볼까요?'},
  {id:'food', label:'과일·채소', en:'Fruit & veg', icon:'🍓', color:'#ffe7df', subtitle:'알록달록, 맛있는 친구들이에요.'},
  {id:'things', label:'물건', en:'Things', icon:'🧸', color:'#e9e5fa', subtitle:'우리 곁에 있는 물건을 찾아봐요.'},
  {id:'numbers', label:'숫자', en:'Numbers', icon:'🔢', color:'#e2effa', subtitle:'하나, 둘! 함께 세어 볼까요?'},
  {id:'hangul', label:'한글', en:'Hangul', icon:'가', color:'#ffedc7', subtitle:'가나다, 말소리와 친해져요.'},
];
const animalNames = [
['강아지','Dog'],['고양이','Cat'],['토끼','Rabbit'],['곰','Bear'],['사자','Lion'],['호랑이','Tiger'],
['코끼리','Elephant'],['기린','Giraffe'],['얼룩말','Zebra'],['원숭이','Monkey'],['판다','Panda'],['코알라','Koala'],
['소','Cow'],['돼지','Pig'],['말','Horse'],['양','Sheep'],['염소','Goat'],['사슴','Deer'],
['다람쥐','Squirrel'],['여우','Fox'],['늑대','Wolf'],['하마','Hippopotamus'],['코뿔소','Rhinoceros'],['캥거루','Kangaroo'],
['펭귄','Penguin'],['오리','Duck'],['닭','Chicken'],['부엉이','Owl'],['거북이','Turtle'],['돌고래','Dolphin']];
const foodNames = [
['사과','Apple'],['바나나','Banana'],['딸기','Strawberry'],['오렌지','Orange'],['포도','Grapes'],['수박','Watermelon'],
['복숭아','Peach'],['배','Pear'],['키위','Kiwi'],['파인애플','Pineapple'],['망고','Mango'],['블루베리','Blueberries'],
['체리','Cherries'],['레몬','Lemon'],['감','Persimmon'],['멜론','Melon'],['자두','Plum'],['아보카도','Avocado'],
['당근','Carrot'],['브로콜리','Broccoli'],['오이','Cucumber'],['토마토','Tomato'],['감자','Potato'],['고구마','Sweet potato'],
['양파','Onion'],['옥수수','Corn'],['호박','Pumpkin'],['양배추','Cabbage'],['시금치','Spinach'],['파프리카','Bell pepper']];
const thingNames = [
['공','Ball'],['자동차','Car'],['버스','Bus'],['기차','Train'],['비행기','Airplane'],['배','Boat'],
['책','Book'],['연필','Pencil'],['크레용','Crayons'],['가방','Backpack'],['신발','Shoes'],['모자','Hat'],
['양말','Socks'],['티셔츠','T-shirt'],['우산','Umbrella'],['시계','Clock'],['전화기','Telephone'],['카메라','Camera'],
['컵','Cup'],['숟가락','Spoon'],['포크','Fork'],['그릇','Bowl'],['칫솔','Toothbrush'],['수건','Towel'],
['의자','Chair'],['책상','Desk'],['침대','Bed'],['곰 인형','Teddy bear'],['풍선','Balloon'],['블록','Blocks']];
const koNumbers = ['일','이','삼','사','오','육','칠','팔','구','십','십일','십이','십삼','십사','십오','십육','십칠','십팔','십구','이십','이십일','이십이','이십삼','이십사','이십오','이십육','이십칠','이십팔','이십구','삼십'];
const enNumbers = ['One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen','Twenty','Twenty-one','Twenty-two','Twenty-three','Twenty-four','Twenty-five','Twenty-six','Twenty-seven','Twenty-eight','Twenty-nine','Thirty'];
const syllables = ['가','나','다','라','마','바','사','아','자','차','카','타','파','하','거','너','더','러','머','버','서','어','저','처','커','터','퍼','허','고','노'];
const romanized = ['ga','na','da','ra','ma','ba','sa','a','ja','cha','ka','ta','pa','ha','geo','neo','deo','reo','meo','beo','seo','eo','jeo','cheo','keo','teo','peo','heo','go','no'];
const make = (category, names) => names.map(([ko,en],index)=>({id:`${category}-${index+1}`,category,index,ko,en}));
export const words = [
  ...make('animals',animalNames), ...make('food',foodNames), ...make('things',thingNames),
  ...koNumbers.map((ko,index)=>({id:`numbers-${index+1}`,category:'numbers',index,ko,en:enNumbers[index],symbol:String(index+1)})),
  ...syllables.map((ko,index)=>({id:`hangul-${index+1}`,category:'hangul',index,ko,en:romanized[index],symbol:ko})),
];
export const getSpeech = (word, language) => ({
  text: word.category === 'hangul' ? word.ko : word[language],
  language: word.category === 'hangul' ? 'ko' : language,
});
