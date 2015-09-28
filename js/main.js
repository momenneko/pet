window.onload = function() {
	var pet_name = document.getElementById('pet_name');
	var mood = document.getElementById('mood');
	var hunger = document.getElementById('hunger');
	var user_name = document.getElementById('user_name');
	var search_word = document.getElementById('search_word');
	var present_location = document.getElementById('present_location');
	var pet_talk = document.getElementById('pet_talk');
	var pet_remark = document.getElementById('pet_remark');
	var pet_search_box = document.getElementById('pet_search_box');
	//statusInit();
	//petTalkInit();
}

// ステータスの初期化
function statusInit() {
	// ペットのステータス
	pet_name.innerHTML = '馬';
	mood.innerHTML = '良い';
	hunger.innerHTML = 'はらへ';
	
	// 飼い主の情報
	user_name.innerHTML = '猫';
	search_word.innerHTML = 'blender, json, three.js';
	present_location.innerHTML = 'つくば市';
}

// ペットの発言の初期化
function petTalkInit() {
	// 検索
	pet_remark.innerHTML = '何について調べますか？';
	pet_search_box.innerHTML = '<input type="text" name="pet_search_word" size="50" value="お前を消す方法"><br><input type="submit" value="検索">';
}