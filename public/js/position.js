function GetElementPos(id) {
		var elm = document.getElementById(id);
		//if(elm === null) return [0,0];
		// [getBoundingClientRect]を参照する
		var rect = elm.getBoundingClientRect();

		// ブラウザの左上からのX座標を取得する
		var positionX = rect.left ;

		// ブラウザの左上からのY座標を取得する
		var positionY = rect.top ;

		// スクロール量の取得に必要なパーツ
		var dElm = document.documentElement , dBody = document.body ;

		// X方向のスクロール量を取得する
		var scrollX = dElm.scrollLeft || dBody.scrollLeft ;

		// Y方向のスクロール量を取得する
		var scrollY = dElm.scrollTop || dBody.scrollTop ;

		// 要素のX座標
		var x = positionX + scrollX ;

		// 要素のY座標
		var y = positionY + scrollY ;

		
		// 結果を表示
		//alert( "X座標:" + x + "px , Y座標:" + y + "px" ) ;	
		return [x,y];
}
	
	//[x,y,width,height]の配列を返す
function getElementArea(id) {
		
	var ary = GetElementPos(id);
	ary.push(parseInt($("#"+id).css('width')));
	ary.push(parseInt($("#"+id).css('height')));
	//return [$("#"+id).css('width'),$("#"+id).css('height')];
	return ary;
}
	
	// 匿名関数内で実行
	//(function (){

		// ------------------------------------------------------------
		// スクロール位置を取得する関数
		// ------------------------------------------------------------
		//var elm = document.getElementById( "size1" );
		//var area = 
		//console.log(getElementArea("size1"));
function DocumentGetScrollPosition(document_obj){
	return{
		x:document_obj.body.scrollLeft || document_obj.documentElement.scrollLeft,
		y:document_obj.body.scrollTop  || document_obj.documentElement.scrollTop
	};
}
function checkMouseOnElement(mouseXY,id) {
	var eArea = getElementArea(id);
	//console.log(mouseXY +" "+eArea);
	if( eArea[0] < mouseXY[0] && mouseXY[0] < eArea[0]+eArea[2] &&
		eArea[1] < mouseXY[1] && mouseXY[1] < eArea[1]+eArea[3]) return true;		
	else return false;

}
