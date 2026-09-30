export const names:Record<string,string>={button:'버튼',wire:'전선',symbols:'상형문자',morse:'모스부호',maze:'미로',music:'모스 & 음표',memory:'기억력',words:'언어유희',complex:'교집합 전선'};
export const rounds=[['button','wire','symbols'],['wire','morse','maze'],['button','symbols','maze','music'],['symbols','music','memory','words'],['wire','morse','maze','complex'],['wire','symbols','maze','memory','words'],['maze','words','music','morse','complex'],['wire','morse','words','music','memory'],['symbols','maze','words','music','memory','complex']];
export const symbolColumns=[['☀','△','ϟ','Ω','☆','♧'],['Ψ','◇','☾','ϟ','♧','⊕'],['Ω','♢','☀','Ψ','⊕','☯']];
export const morse:Record<string,string>={A:'.-',B:'-...',C:'-.-.',D:'-..',E:'.',F:'..-.',G:'--.',H:'....',I:'..',J:'.---',K:'-.-',L:'.-..',M:'--',N:'-.',O:'---',P:'.--.',Q:'--.-',R:'.-.',S:'...',T:'-',U:'..-',V:'...-',W:'.--',X:'-..-',Y:'-.--',Z:'--..'};
export const morsePictures=[
 {answer:'GAME',symbol:'🎮',label:'게임기'},
 {answer:'BEER',symbol:'🍺',label:'맥주'},
 {answer:'SNOW',symbol:'❄️',label:'눈송이'},
 {answer:'BEE',symbol:'🐝',label:'벌'},
 {answer:'DOG',symbol:'🐕',label:'강아지'},
 {answer:'CAT',symbol:'🐈‍⬛',label:'고양이'}
];
export const musicMap:Record<string,string>={A:'♩',B:'♪',C:'♫',D:'♬',E:'♭',F:'♯'};
export const wordColumns=[
 ['@circle:red','아무것도','오른쪽 위','@arrow:se','노란색','빈칸','잠깐만','7번',''],
 ['@circle:blue','오른쪽 아래','@arrow:nw','빨간색','그거 눌러','빈칸','안 보여','2번',''],
 ['@circle:green','왼쪽 아래','@arrow:ne','초록색','누르세요','빈칸','몇 시야?','9번',''],
 ['@circle:yellow','왼쪽 위','@arrow:sw','파란색','다시','빈칸','없는데?','4번','']
];
export const mazePaths=[[0,1,7,13,12,18,24,25,26,20,14,15,9,3,4,5,11,17,16,22,28,29,35],[0,6,12,13,7,8,2,3,9,15,14,20,26,25,31,32,33,27,21,22,16,17,23,29,35],[0,1,2,8,14,13,19,18,24,30,31,25,26,20,21,15,9,10,4,5,11,17,23,22,28,34,35]];
export const complexRules=['자름','일련번호 끝 짝수','별이 있으면 자름','자르지 않음','자름','별이 있으면 자름','일련번호 끝 짝수','자르지 않음'];
export const teamNames=['ALPHA','BRAVO','CHARLIE','DELTA','ECHO','FOXTROT','GOLF','HOTEL'];
export function timeText(ms:number){const sec=Math.max(0,Math.ceil(ms/1000));return `${Math.floor(sec/60).toString().padStart(2,'0')}:${(sec%60).toString().padStart(2,'0')}`}

export const missionMazePaths = [...mazePaths, ...mazePaths.map(path=>path.map(i=>Math.floor(i/6)*6+5-i%6))];
