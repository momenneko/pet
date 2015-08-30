window.onload = function() {
	var pet_name = document.getElementById('pet_name');
	var mood = document.getElementById('mood');
	var hunger = document.getElementById('hunger');
	var user_name = document.getElementById('user_name');
	var search_word = document.getElementById('search_word');
	var present_location = document.getElementById('present_location');
	statusInit();
}

// ステータスの初期化
function statusInit() {
	// ペットのステータス
	pet_name.innerHTML = '馬';
	mood.innerHTML = '';
	hunger.innerHTML = 'はらへ';
	
	// 飼い主の情報
	user_name.innerHTML = '猫';
	search_word.innerHTML = 'blender, json, three.js';
	present_location.innerHTML = 'つくば市';
}