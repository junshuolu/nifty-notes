# Project Review

## 褰撳墠椤圭洰鐘舵€?

`Nifty Notes` 鐩墠鏄竴涓凡缁忓彲閮ㄧ讲銆佸彲婕旂ず銆佸彲鍩虹璇曠敤鐨勫弻璋辫〃閽㈢惔浣滄洸鍣ㄥ墠绔師鍨嬨€?

褰撳墠宸茬粡鍏峰锛?

- 鍙岃氨琛ㄧ偣閫夊綍鍏ワ紙楂橀煶 + 浣庨煶璋卞彿锛?
- 鍜屽鸡杈撳叆涓庡拰寮︾紪杈?
- 鎷嶅彿鍒囨崲锛歚4/4`銆乣3/4`銆乣2/4`銆乣6/8`銆乣7/8`銆乣9/8`
- 鑷畾涔夋媿鍙凤紙鍒嗗瓙 / 鍒嗘瘝 / 鍒嗙粍锛?
- 闄勭偣
- 涓存椂璁板彿锛堝崌鍙?鈾€侀檷鍙?鈾€佽繕鍘熷彿 鈾級
- 濂忔硶璁板彿銆佽楗伴煶銆佸姏搴﹁鍙枫€佹瓕璇?
- 璋冨彿鍒囨崲
- 灏忚妭绾?tempo mark
- 榛樿绌虹櫧璋遍潰淇濇寔鍥涘垎浼戞绗﹂鏋讹紝鍙湁瀹為檯鍐欏叆鐨勯偅涓€鎷嶄細缁х画缁嗗垎
- 涓ゅ嚮寮忔彃鍏?+ 姘存淮鍥炬爣棰勮
- 鍐呯疆鑷寸埍涓戒笣绀鸿寖鏇茶氨锛堢敤鎴疯繘鍏ュ嵆鍙挱鏀撅級
- Demo / Clear 鎸夐挳
- useMemo 鎬ц兘缂撳瓨
- 鍥炴斁锛堝惈涓存椂璁板彿鍗婇煶澶勭悊锛?
- Tie 涓?Slur
- 璋遍潰鍐呮爣棰樸€佸壇鏍囬涓庣讲鍚嶇紪杈?
- 闈欐€侀儴缃?

绾夸笂婕旂ず鍦板潃锛?

```text
http://8.210.93.101:3001
```

瀹㈡埛鍘熺綉绔欙細

```text
https://www.niftynotes.com.au/
```

## 鎶€鏈灦鏋?

- **妗嗘灦**: React + Vite (TypeScript)
- **涔愯氨娓叉煋**: VexFlow v5锛圫VG 鏂瑰紡锛?
- **闊抽鎾斁**: Tone.js锛堥挗鐞撮噰鏍?+ 鍗虫椂棰勮闊筹級
- **鏁版嵁妯″瀷**: `MeasureData[]`锛屾瘡涓?measure 鍖呭惈鐙珛鐨?`trebleItems` 鍜?`bassItems`
- **甯冨眬**: 姣忎釜 beat / group 鎸夊疄闄呰妭濂忓瘑搴﹀姩鎬佹墿瀹斤紝楂橀煶浣庨煶璋辫〃鍚勮嚜鐙珛鎺掑竷
- **鐘舵€佺鐞?*: React useState锛岄€氳繃闆嗕腑鏇存柊 measures 椹卞姩娓叉煋
- **鎬ц兘**: `buildSystems` 绛夐€氳繃 `useMemo` 缂撳瓨锛岄槻姝㈡棤闄愰噸娓叉煋
- **鎷嶅彿妯″瀷**: 閫氳繃 `parseTimeSignature(...)` 缁熶竴瑙ｆ瀽鍒嗗瓙銆佸垎姣嶃€佸垎缁勫拰 subdivision 鎬婚噺

## 鍏抽敭鏂囦欢

| 鏂囦欢 | 鑱岃矗 |
|------|------|
| `src/App.tsx` | 涓荤晫闈€佷氦浜掗€昏緫銆乼oolbar tabs銆乻core-front 鐑偣銆乂exFlow 娓叉煋銆佹挱鏀炬帶鍒?|
| `src/App.css` | 椤甸潰鏍峰紡銆佸乏渚у浐瀹氭爮銆佸彸渚ф粴鍔ㄥ尯銆乼oolbar銆乸opover銆佽氨闈氦浜掓牱寮?|
| `src/composer/constants.ts` | 绫诲瀷瀹氫箟銆佸父閲忋€侀煶鍩熴€佹媿鍙枫€佽皟鍙枫€侀粯璁ら厤缃?|
| `src/composer/score.ts` | 闊抽珮鏄犲皠銆佹椂鍊兼崲绠椼€佸惛闄勩€佹挱鏀剧墖娈点€佹媿鍙峰垎缁勩€佸竷灞€绯荤粺 |
| `src/composer/CursorPreview.tsx` | 榧犳爣鎮仠闊崇棰勮 |
| `src/composer/furElise.ts` | 鑷寸埍涓戒笣绀鸿寖鏇茶氨鏁版嵁锛?5灏忚妭锛?|

## 杩戞湡澶ц妯″彉鏇?(2026-03-31)

### 1. 鍏ㄥ眬鐩磋 UI
- **闂**锛氭棫鐗?UI 鍖呭惈澶ч噺鐨勫渾瑙?(`border-radius`)銆?
- **澶勭悊**锛氱Щ闄や簡 `App.css` 涓墍鏈夊鍣ㄣ€佹寜閽€佸崱鐗囩殑 `border-radius`锛屽疄鐜板叏鐩樻柟瑙掞紙Square Corners锛夛紝浣胯璁¤瑷€鏇寸‖鏈楃幇浠ｃ€?

### 2. 浼戞绗︾粏鍒嗕笌鍔ㄦ€佹媶鍒嗛€昏緫
- **闂**锛氱┖灏忚妭娌℃湁姝ｇ‘榛樿鍥涘垎浼戞绗︼紱鑰屼笖鎻掑叆鍗佸叚鍒嗛煶绗︽椂锛屼紤姝㈢鍗犱綅鎷嗗垎涓嶅鏅鸿兘銆?
- **澶勭悊**锛?
  - 榛樿绌烘媿鏄剧ず锛堜緥濡?4/4 鎷嶏級鐢?2 涓叓鍒嗕紤姝㈢鏀规垚 1 涓洓鍒嗕紤姝㈢ (`getGroupPlaceholderLength`)銆?
  - 閫氳繃浜屽垎閫掑綊寮忕殑鎸変綅瀵归綈绠楁硶 (`getFocusedPlaceholderLength`)锛屽疄鐜颁簡鐒︾偣鍦ㄧ┖鎷嶄綅鏃讹紝鎮仠 16 鍒嗛煶绗﹁嚜鍔ㄦ樉绀?`16th, 16th, 8th`锛堝嵆涓や釜鍗佸叚鍒嗗姞涓€涓叓鍒嗭級鐨勭粡鍏镐紤姝㈠垝鍒嗐€傛彃鍏ュ墠涓や釜 16 鍒嗛煶绗﹀悗锛屽墿浣欑殑 8 鍒嗕紤姝㈢浼氳嚜鍔ㄦ牴鎹柊鐒︾偣杩涗竴姝ユ媶鍒嗕负涓や釜 16 鍒嗕紤姝㈢銆?
  
### 3. Dynamics 娓叉煋浣嶇疆璐磋繎浜旂嚎璋?
- **澶勭悊**锛氳皟鏁翠簡 `VexFlow` 鐨?`Annotation` 鍋忕Щ锛宍setYShift` 鐢?`-6` 鏀逛负 `-24`锛屼粠鑰岃 `p`銆乣mf` 绛夊姏搴﹁鍙锋洿鍔犵揣璐翠簲绾胯氨搴曢儴銆?
  
### 4. 鍙栨秷鍏ㄥ眬 Key Signature (璋冨彿)
- **闂**锛氬叏灞€鍒囨崲璋冨彿瀛樺湪澶嶆潅鐨勯€昏緫鏄犲皠涓庨煶绗︽樉绀哄啿绐侊紝鐢ㄦ埛鏇村€惧悜浜庝娇鐢ㄥ眬閮ㄧ殑涓存椂鍗囬檷鍙疯繘琛屽垱浣溿€?
- **澶勭悊**锛氬交搴曠Щ闄や簡 `scoreFrontHotspots` 涓礋璐ｆ覆鏌揔ey Signature鐨勯儴鍒嗐€傜Щ闄や簡鍖呭惈鍗囬檷杩樺師鍙烽€昏緫鐨?`Bars` Tab蹇嵎鎸夐挳锛屽苟鍦?`buildSystems` 鐨勬覆鏌撴祦绋嬩腑绉婚櫎浜?`addKeySignature` 姝ラ銆?

### 5. 鍗佸叚鍒嗛煶绗︽彃鍏ヤ綅缃殑瑙嗚瀵归綈 (Preview X-Offset)
- **闂**锛氬湪鍘熸湁鐨勬彃鍏ラ瑙堟満鍒朵腑锛屽崄鍏垎闊崇/浼戞绗﹀洜涓哄搴︽瀬灏忥紝瑙嗚涓婁腑蹇冨榻愭椂鎰熻鎬绘槸"鍋忓彸"锛屽鑷寸偣鍑诲懡涓笉鏄庣‘銆?
- **澶勭悊**锛氭垜浠湪 `clampPreviewX` 涓拡瀵瑰瘑闆嗛煶绗?(`16n`, `32n`) 纭紪鐮佷簡 `-6px` 鐨?X杞村悜宸﹀亸绉?(`const IS_DENSE = ['16n', '32n'].includes(...)`)锛屼娇鍏堕瑙堟爣璁颁弗鏍煎榻愬湪浼戞绗︾殑**鏈€宸︿晶缂?*锛屾彁鍗囦簡鐩爣瀵归綈鐨勭洿瑙傛€с€?

### 6. Time Signature Popover 甯冨眬鎷撳睍
- **闂**锛?Apply Meter" 鎸夐挳鍥犱负鍘熻璁″搴?(`392px`) 杈冪獎锛屼笖鍖呭惈澶氫釜琛ㄥ崟缁勪欢瀵艰嚧鐣岄潰鎷ユ尋锛岄儴鍒嗗厓绱犵敋鑷宠鍒囧壊銆?
- **澶勭悊**锛氬湪 `App.css` 涓皢 `.score-front-popover--time` 鐨?`width` 鏀惧ぇ鑷?`480px` 瑙ｅ喅婧㈠嚭銆?
### 5. 鍜屽鸡绾ф偓鍋滈瑙?(Chord Pre-Insert Preview)
- **闂**锛氬湪鍘熼€昏緫涓紝鐢ㄦ埛鐐瑰嚮绌虹櫧澶勭殑浼戞绗︽椂锛屾湁鍗婇€忔槑鎮仠棰勮锛坄PendingInsertIndicator`锛夈€備絾鍦ㄤ负鐜版湁闊崇娣诲姞鍜屽鸡闊虫椂锛堥€変腑闊崇鐒跺悗涓婁笅绉诲姩榧犳爣锛夛紝娌℃湁鐩磋鐨勮瑙夊弽棣堛€?
- **澶勭悊**锛氬湪 `App.tsx` 鐨?`handleScoreMouseMove` 涓紝濡傛灉榧犳爣涓嬫柟鐨勭洰鏍囬煶绗︽鏄綋鍓嶆縺娲荤殑 `activeItemId`锛屽垯璁＄畻鍑哄畠鐨?`previewY` 骞舵洿鏂板埌鏂扮姸鎬?`chordHoverPreview` 涓€傛覆鏌撲晶鍒╃敤鐜版湁鐨?`PendingInsertIndicator` 缁勪欢锛屽疄鐜颁簡涓庡垵娆¤惤閿浉鍚岃川鎰熺殑姘存淮铏氬奖棰勬樉浣撻獙銆?

### 6. 鍗佸叚鍒嗛煶绗﹀姩鎬佹í鍚戞嫇瀹?(Contextual Measure Expansion)
- **闂**锛氬崄鍏垎闊崇鍫嗗彔鏃跺皬鑺傚搴︿笉澶燂紝闊崇绱у噾锛岀敤鎴风偣鍑绘瀬搴﹀洶闅句笖瀹规槗璇搷浣溿€?
- **澶勭悊**锛氶噸鏋勪簡 `score.ts` 涓殑 `SIXTEENTH_VISUAL_UNITS_PER_BEAT` 鏉冮噸锛堜粠 `3.5` 鎷旈珮鍒?`5.0`锛夈€傜幇鍦ㄤ竴鏃︽帰娴嬪埌鑺傛媿鍐呭瓨鍦?16 鍒嗘垨鏇寸煭鐨勯煶绗︼紝璇ュ皬鑺傜殑瀹藉害鍒嗛厤姹犲皢琚珛鍒绘垚鍊嶆斁澶э紝纭繚 16 鍒嗛煶绗︽湁鏋佷匠鐨勭偣鍑诲懠鍚告劅銆?

### 7. Gallery 鎺掔増浼樺寲
- **澶勭悊**锛氬交搴曢噸鎺掍簡 `.gallery-grid`锛屼娇鐢?24px 鍒楅棿璺濆苟鍔犲叆浜嗗井绉垎寮忕殑鎮仠鎶曞奖缂撳姩鍔ㄧ敾锛岄伩鍏嶄簡鍓╀綑鍗＄墖鎸や綔涓€鍥€?
## 鍘嗗彶杞瑙ｅ喅鐨勯棶棰?

### 1. 浼戞绗﹁瑙変綅缃?

闂锛?
- 浼戞绗﹀湪姣忎釜 bar 閲岀湅璧锋潵鍋忓彸锛岃璋变笉鑷劧

澶勭悊锛?
- 瀵逛紤姝㈢鍋氫簡鍗曠嫭鐨勬í鍚戝亸绉伙紝璁╁畠鍦ㄥ浐瀹氱綉鏍间笂鐣ュ井鍚戝乏

### 2. 鐐瑰嚮鍚庡０闊冲欢杩?

闂锛?
- 绗竴娆＄偣鍑婚煶绗︽椂锛岄挗鐞撮噰鏍峰姞杞藉鑷撮瑙堥煶鏄庢樉寤惰繜

澶勭悊锛?
- 鐐瑰嚮鎻掑叆鏃跺厛缁欎竴涓嵆鏃堕瑙堥煶
- 鍚屾椂鍦ㄥ悗鍙扮户缁姞杞介挗鐞撮噰鏍?
- 涔嬪悗姝ｅ紡鎾斁浠嶇劧浣跨敤閽㈢惔闊宠壊

### 3. 鐐瑰埌鐨勯煶鍜岃惤涓嬬殑闊充笉涓€鑷?

闂锛?
- 瀹㈡埛鍙嶉锛氱偣 `B4` 瀹规槗钀芥垚 `A4`
- 榧犳爣鎮仠鍜屽疄闄呮彃鍏ヤ笉澶熺洿瑙?

澶勭悊锛?
- 淇楂橀煶璋辫〃鍜屼綆闊宠氨琛ㄧ殑椤堕儴鍩哄噯绾挎槧灏?
- 鐜板湪璋遍潰鐐瑰嚮銆侀瑙堟爣绛俱€佸疄闄呰惤鐐逛笁鑰呬繚鎸佷竴鑷?

### 4. Tempo / Metronome

澶勭悊锛?
- 鎶婂彸涓婅 Tempo 鏀规垚鍙偣鍑荤殑璁剧疆闈㈡澘
- 鏀寔鐩存帴璋?BPM
- 鏀寔 Metronome On / Off

### 5. 鎾斁杞ㄨ抗涓嶆槑鏄?

澶勭悊锛?
- 鏂板璐┛楂橀煶鍜屼綆闊宠氨琛ㄧ殑绔栧悜鎾斁绾?

### 6. 鍗犱綅浼戞绗︿笉搴旇鏁村皬鑺傞閾烘弧

澶勭悊锛?
- 鍗犱綅浼戞绗﹂噸鏂版敹鍥炲埌榛樿鍥涘垎楠ㄦ灦
- 鍙湁鐪熸鍐欏叆鍐呭鐨勯偅涓€鎷嶆墠浼氱户缁粏鍒嗘浛鎹?
- 姣忎釜 bar 鐨勬覆鏌撲簰鐩搁殧绂?

### 7. 鏈熬鍗佸叚鍒嗛煶绗﹀拰 Half 棰勮瀵逛綅

澶勭悊锛?
- 鎸夋瘡涓?beat 鐨勭湡瀹炶妭濂忓瘑搴︽墿瀹?
- 楂橀煶浣庨煶璋辫〃鍚勮嚜鐙珛鎺掑竷
- 鎮仠棰勮鍜岀湡瀹炵鍙风粺涓€杈圭晫浼扮畻

### 8. 褰撳墠 beat 鐨勫崰浣嶄紤姝㈢娓愯繘缁嗗垎

澶勭悊锛?
- `8th` 绌烘媿浣嶅厛鏄剧ず涓や釜鍏垎浼戞绗?
- `16th` 绌烘媿浣嶅厛鏄剧ず `16th + 16th + 8th`
- 楂橀煶浣庨煶鐨?placeholder focus 鍒嗗紑澶勭悊

### 9. 鎻掑叆鎸囩ず鍣ㄦ敼涓烘偓鍋滈珮浜姞姘存淮鍥炬爣

闂锛?
- 涔嬪墠鐨勫渾鍦堝姞 Insert here 鏍囩娴眰瑙嗚涓婁笉鐩磋
- 涓ゆ鎿嶄綔娴佺▼涓嶇鍚堢洿瑙?

澶勭悊锛?
- 鏀逛负榧犳爣鎮仠鍗抽珮浜細婊戣繃浼戞绗︽椂璇ヤ紤姝㈢鑷姩鍙樿摑
- 鍦ㄩ珮浜紤姝㈢涓嬫柟鏄剧ず钃濊壊姘存淮鍥炬爣
- 绗竴娆＄偣鍑诲惎鍔ㄩ鎻掑叆锛岀浜屾鐐瑰嚮鐪熸鎻掑叆闊崇
- 鍙互鍦ㄤ换鎰忎綅缃嚜鐢辨彃鍏?

### 10. useMemo 鎬ц兘缂撳瓨

澶勭悊锛?
- 瀵?`buildSystems`銆乣getMeasureSubdivisions`銆乣getBeatsPerMeasure` 浣跨敤 `useMemo` 缂撳瓨
- 娑堥櫎浜嗘棤鎰忎箟鐨勯噸娓叉煋寰幆鍜岄〉闈㈠崱姝?

### 11. 涓存椂璁板彿锛圓ccidentals锛?

澶勭悊锛?
- 鏂板鍗囧彿 鈾€侀檷鍙?鈾€佽繕鍘熷彿 鈾?涓変釜 toggle 鎸夐挳
- `NoteItem` 鏂板 `accidentals` 瀛楁瀛樺偍姣忎釜闊抽珮鐨勪复鏃惰鍙?
- VexFlow 娓叉煋鏃堕€氳繃 `Accidental` modifier 鏄剧ず绗﹀彿
- Tone.js 鎾斁鏃舵寜鍗婇煶姝ｇ‘澶勭悊
- `createVisualNote` / `insertAtPosition` / `toTonePitch` / `getPitchLabel` 鍏ㄩ摼璺敮鎸?

### 12. 鑷寸埍涓戒笣绀鸿寖鏇茶氨

澶勭悊锛?
- 鏂板 `furElise.ts`锛屽寘鍚礉澶氳姮鑷寸埍涓戒笣 A 涓婚 + B 娈佃繃娓″叡 25 灏忚妭
- 鍘熸洸 3/8 鎷嶇敤 3/4 鎷嶇瓑鏁堢紪鐮侊紙闊冲€煎€嶅锛夛紝72 BPM
- 楂橀煶閮ㄥ寘鍚棆寰嬶紙鍚?D鈾€丟鈾?涓存椂璁板彿锛夛紝浣庨煶閮ㄥ寘鍚拰寮︿即濂?
- 鐢ㄦ埛杩涘叆缃戠珯鍗抽粯璁ゅ姞杞斤紝鍙洿鎺?Play 璇曞惉
- 鏂板 Demo 鎸夐挳锛堥噸鏂板姞杞斤級鍜?Clear 鎸夐挳锛堟竻绌烘墍鏈夐煶绗︼級

### 13. 宸︿晶璇存槑鏍忎笌鍙充晶浣滄洸鍖哄垎绂?

闂锛?
- 搴曢儴鐘舵€佹爮淇℃伅閲忓闀垮悗锛屼笉閫傚悎缁х画鏀惧湪璋遍潰涓嬫柟

澶勭悊锛?
- 宸︿晶鏀规垚鍥哄畾璇存槑涓庣姸鎬佹爮
- 鍙充晶鏀规垚鐙珛婊氬姩鐨勪綔鏇插尯鍩?
- 宸︿晶浼氭牴鎹綋鍓?tab銆佸綋鍓嶇鍙峰拰褰撳墠閫変腑闊崇鍒囨崲璇存槑

### 14. toolbar 鏀逛负 tab 鍖栫粨鏋?

澶勭悊锛?
- 椤堕儴宸ュ叿鍖烘敼涓?`Notes / Articulations / Ornaments / Dynamics / Measures / Text`
- 鍚勭被璁板彿涓嶅啀娣峰湪涓€涓尯鍩熼噷
- `Articulations`銆乣Ornaments`銆乣Dynamics`銆乣Text` 閮芥湁鐙珛鍏ュ彛鍜岃鏄庡崱鐗?

### 15. 璋遍潰鍐呴儴鏍囬鍖?

澶勭悊锛?
- 鍦ㄨ氨闈笂鏂规柊澧炲彲鐩存帴缂栬緫鐨勬爣棰樺尯
- 鏀寔鏍囬銆佸壇鏍囬銆丆omposer銆丩yricist銆丄rranger
- 涓嶅啀闇€瑕侀澶栧脊绐楃紪杈戣繖浜涘厓淇℃伅

### 16. 鍜屽鸡缂栬緫閫昏緫淇

闂锛?
- 涓轰簡闃叉璇彃鍏ワ紝鏃╂湡淇涓€搴︽妸鍜屽鸡鍏ュ彛鎸℃帀浜?

澶勭悊锛?
- 绗竴娆＄偣鍑诲凡鏈夐煶绗︼細杩涘叆閫変腑鎬?
- 鍦ㄥ凡閫変腑鐨勫悓鎷嶄綅鍐嶇偣鍏跺畠闊抽珮锛氬姞鍏ュ拰寮?
- `Shift + Click` 鍜屽鸡涓殑鏌愪釜闊筹細绉婚櫎璇ラ煶

### 17. 璋冨彿銆佹媿鍙蜂笌 score-front 鐑偣

澶勭悊锛?
- 鍦ㄨ氨闈㈠墠瀵煎尯鏂板 `Key Signature` 鍜?`Time Signature` 鐑偣
- 鐐瑰嚮鍚庣洿鎺ュ脊鍑哄搴?picker
- 寮规瀹氫綅鏀逛负鎸夌儹鐐瑰潗鏍囧榻愶紝涓嶅啀鏄庢樉鍋忕Щ

### 18. 鑷畾涔夋媿鍙蜂笌 grouped meter

澶勭悊锛?
- `Time Signature` 涓嶅啀鍙槸 `4/4 / 3/4 / 2/4` 涓変釜鍥哄畾鎸夐挳
- 鏀寔杈撳叆 Numerator銆丏enominator 鍜?Grouping
- 榛樿鏀寔 `6/8`銆乣7/8`銆乣9/8`
- `6/8` 鎸?`3+3`
- `9/8` 鎸?`3+3+3`
- `7/8` 鎸?`2+2+3`
- grouped meter 浼氬奖鍝?placeholder rest銆乥eam grouping銆乵easure capacity 鍜屾挱鏀炬椂闂寸嚎

### 19. 鍒囨崲鎷嶅彿涓嶅啀绠€鍗曟竻绌轰竴鍒?

澶勭悊锛?
- 鏀规媿鍙峰悗浼氬敖閲忎繚鐣欒繕鑳芥斁杩涙柊灏忚妭闀垮害閲岀殑鍐呭
- 鍙Щ闄よ秴鍑烘柊瀹归噺鐨勯煶绗﹀拰浼戞绗?
- 鍚庣画 placeholder rest 浼氭寜鏂版媿鍙烽噸绠?

### 20. VexFlow odd meter 娓叉煋绋冲畾鎬?

闂锛?
- 鍒囨崲鍒?`7/8` 绛変笉瑙勫垯鎷嶅彿鏃讹紝浼氬嚭鐜?`IncompleteVoice`

澶勭悊锛?
- 瀵瑰綋鍓?app 鑷繁绠＄悊 grid 鐨?voice 鏀圭敤 `Voice.Mode.SOFT`
- 閬垮厤 odd meter 鍒囨崲鏃舵暣椤垫覆鏌撳穿婧?

## 杩欎竴杞『鎵嬬粺涓€鐨勫湴鏂?

- `Duration` 鏀逛负 `Note Value`
- `Meter` 鏀逛负 `Time Signature`

## 鐩墠浠嶇劧瀛樺湪鐨勯檺鍒?

- 鏆傛椂娌℃湁淇濆瓨銆佸鍑哄拰璐﹀彿绯荤粺
- 璋冨彿涓嶄細鑷姩閲嶅啓宸叉湁闊崇鐨勪复鏃惰鍙?
- `Slur` 鐩墠闄愬埗鍦ㄥ悓涓€ staff銆佸悓涓€绯荤粺鍐?
- `7/8` 绛変笉瑙勫垯鎷嶅彿宸叉敮鎸佽嚜瀹氫箟鍒嗙粍锛屼絾杩樻病鏈夊仛鎴愬揩鎹烽璁炬寜閽?
- 绗竴娆″畬鏁存挱鏀惧鏋滈挗鐞撮噰鏍峰皻鏈噯澶囧ソ锛屼粛鐒跺彲鑳藉厛缁忓巻涓€娆″姞杞?

## Session 2 鏂板宸ヤ綔

### 21. MXL (MusicXML) 鈫?TypeScript 鑷姩杞崲绠＄嚎

闂锛?
- 姝ゅ墠鐨?demo 鏇茶氨鏄嚟璁板繂鎵嬪啓鐨勶紝闊崇鍑嗙‘搴︽湁闄?
- PDF 鏍煎紡鐨勪箰璋辨棤娉曡 AI 鐩存帴璇诲彇

澶勭悊锛?
- 缂栧啓浜?`mxl_convert.js` Node.js 鑴氭湰
- 浠?MXL (ZIP 鍖呭惈 MusicXML) 鏂囦欢涓嚜鍔ㄨВ鏋愬叏閮ㄩ煶绗︽暟鎹?
- 鏀寔鐨?MusicXML 鍏冪礌锛歚pitch`銆乣alter`銆乣accidental`銆乣chord`銆乣rest`銆乣dot`銆乣tie`銆乣staccato`銆乣divisions`銆乣backup`銆乣forward`
- 涓€閿浆鎹负绗﹀悎 `MeasureData[]` 绫诲瀷鐨?TypeScript 鏂囦欢
- 淇濈暀璋冨彿 (`fifths`)銆佹媿鍙?(`beats/beat-type`)銆侀€熷害 (`metronome/per-minute`) 绛夊厓鏁版嵁

宸ヤ綔娴侊細
1. 鐢?MuseScore 鎵撳紑璋卞瓙 鈫?瀵煎嚭 `.mxl`
2. 鏀惧叆 `frontend/Piano sheet music/`
3. 杩愯 `node mxl_convert.js`
4. 鍦?`App.tsx` gallery 鏁扮粍涓坊鍔?entry

### 22. 馃幑 Gallery tab锛堥挗鐞村悕鏇插簱锛?

澶勭悊锛?
- 鏂板 `Gallery` tab锛屽湪 toolbar 涓樉绀?9 寮?demo 鍗＄墖
- 姣忓紶鍗＄墖灞曠ず锛氭爣棰樸€佸壇鏍囬銆佷綔鏇插銆佹媿鍙枫€丅PM銆佽皟鍙?
- 鐐瑰嚮鍗冲姞杞藉畬鏁翠箰璋卞埌缂栬緫鍣紝鑷姩璁剧疆鎵€鏈夊厓鏁版嵁
- 鍔犺浇鍚庤嚜鍔ㄥ垏鎹㈠埌 Notes tab

宸茬簿纭浆鎹㈢殑 9 棣栨洸鐩細

| 鏇茬洰 | 灏忚妭鏁?| 鎷嶅彿 | BPM | 璋冨彿 |
|------|--------|------|-----|------|
| F眉r Elise | 104 | 3/8 | 120 | C |
| Turkish March | 51 | 2/4 | 130 | C |
| Rain and Your | 37 | 4/4 | 70 | C |
| Summer | 58 | 4/4 | 90 | D |
| Croatian Rhapsody | 97 | 4/4 | 120 | Eb |
| Mariage d'Amour | 83 | 4/4 | 72 | Bb |
| Souvenirs D'Enfance | 57 | 10/8 | 120 | G |
| Annie's Wonderland | 65 | 4/4 | 101 | F# |
| Carrying You | 82 | 4/4 | 83 | C |

### 23. Toolbar 绠€鍖?

澶勭悊锛?
- `Measures` tab 鐨?**Time Signature** 绮剧畝涓?`4/4`銆乣3/4`銆乣2/4` 涓変釜蹇嵎鎸夐挳
- `Measures` tab 鐨?**Key Signature** 绮剧畝涓?`鈾璥銆乣鈾甡銆乣鈾痐 涓変釜鎸夐挳
- 涓ゅ鍧囧鍔?More: click on staff 鈫?鎻愮ず锛屽紩瀵肩敤鎴烽€氳繃璋遍潰鍓嶅鍖哄脊妗嗚幏鍙栨洿澶氶€夐」
- 鍑忓皯淇℃伅鍫嗙Н锛岄《閮ㄦ洿娓呯埥

### 24. Slur 娓叉煋淇

闂锛?
- 楂橀煶璋辫〃涓婄殑杩為煶绾垮拰浜旂嚎璋变互鍙婇煶绗﹂噸鍙?

澶勭悊锛?
- 楂橀煶璋辫〃杩為煶绾挎敼涓哄湪璋辫〃涓婃柟寮у舰缁樺埗锛坄yShift: -30`, 鎺у埗鐐?`y: -40`锛?
- 浣庨煶璋辫〃杩為煶绾夸繚鎸佸湪涓嬫柟

### 25. 浼戞绗﹂粯璁ゆ樉绀轰紭鍖?

闂锛?
- 绌烘媿浣嶉粯璁ゆ樉绀轰竴涓洓鍒嗕紤姝㈢锛岃瑙変笂涓嶅缁嗚嚧

澶勭悊锛?
- 绌烘媿浣嶆敼涓洪粯璁ゆ樉绀轰袱涓叓鍒嗕紤姝㈢
- 淇 `getPlaceholderDurationForLength` 涓潯浠跺垽鏂『搴?

### 26. 灏忚妭瀹藉害澧炲姞

澶勭悊锛?
- `SYSTEM_MEASURE_WIDTH` 浠?182px 澧炲姞鑷?220px
- 鏀瑰杽鍗佸叚鍒嗛煶绗﹀瘑闆嗘帓鍒楁椂鐨勯棿璺濆拰鐐瑰嚮鐩爣澶у皬

## 鍏抽敭鏂囦欢锛堟洿鏂帮級

| 鏂囦欢 | 鑱岃矗 |
|------|------|
| `src/App.tsx` | 涓荤晫闈€佷氦浜掗€昏緫銆乼oolbar tabs銆乻core-front 鐑偣銆乂exFlow 娓叉煋銆佹挱鏀炬帶鍒躲€丟allery |
| `src/App.css` | 椤甸潰鏍峰紡銆佸乏渚у浐瀹氭爮銆佸彸渚ф粴鍔ㄥ尯銆乼oolbar銆乸opover銆乬allery card 鏍峰紡 |
| `src/composer/constants.ts` | 绫诲瀷瀹氫箟銆佸父閲忋€侀煶鍩熴€佹媿鍙枫€佽皟鍙枫€侀粯璁ら厤缃?|
| `src/composer/score.ts` | 闊抽珮鏄犲皠銆佹椂鍊兼崲绠椼€佸惛闄勩€佹挱鏀剧墖娈点€佹媿鍙峰垎缁勩€佸竷灞€绯荤粺 |
| `src/composer/CursorPreview.tsx` | 榧犳爣鎮仠闊崇棰勮 |
| `src/composer/furElise.ts` | 鑷寸埍涓戒笣绀鸿寖鏇茶氨鏁版嵁锛堟棫鐗堟墜鍐?25 灏忚妭锛?|
| `src/composer/demos/` | MXL 绮剧‘瀵煎叆鐨?9 棣栭挗鐞村悕鏇?demo 鏁版嵁 |
| `src/composer/demos/turkish.ts` | Turkish March锛?1 灏忚妭锛?/4锛?30 BPM锛?|
| `src/composer/demos/rain.ts` | Rain and Your锛?7 灏忚妭锛?/4锛?0 BPM锛?|
| `src/composer/demos/summer.ts` | Summer锛?8 灏忚妭锛?/4锛?0 BPM锛?|
| `src/composer/demos/croatian.ts` | Croatian Rhapsody锛?7 灏忚妭锛?/4锛?20 BPM锛?|
| `src/composer/demos/wedding.ts` | Mariage d'Amour锛?3 灏忚妭锛?/4锛?2 BPM锛?|
| `src/composer/demos/souvenirs.ts` | Souvenirs D'Enfance锛?7 灏忚妭锛?0/8锛?20 BPM锛?|
| `src/composer/demos/annies.ts` | Annie's Wonderland锛?5 灏忚妭锛?/4锛?01 BPM锛?|
| `src/composer/demos/carrying.ts` | Carrying You锛?2 灏忚妭锛?/4锛?3 BPM锛?|
| `src/composer/demos/furElise_new.ts` | F眉r Elise 鈥?MXL 绮剧‘鐗堬紙104 灏忚妭锛?/8锛?20 BPM锛?|

## 2026-04-14 Frontend Interaction Fixes

- Scope: fixed note-hover alignment, score-front key/time chooser targeting, and per-system measure numbering without changing the existing insert-note / placeholder-rest editing flow.
- Hover alignment: chord-edit hover previews now derive their X position from the selected note's real subdivision span, so the blue pending note no longer appears above the note on the right.
- Score-front hotspots: key-signature and time-signature click areas are now computed from rendered VexFlow stave modifiers instead of hard-coded front widths. This keeps the hotspot near the actual symbol on each system.
- Score-front popovers: the chooser now opens from the clicked symbol's center, and key-signature popovers use the dedicated wider key layout instead of the time-signature width.
- Measure numbers: each system-start treble stave now renders its starting bar number (1-based), which makes long scores easier to navigate line by line.
- Key signatures now render at every system start, not just the first line.
- For `C` key, the score now reserves key-signature space and draws a dark natural-sign placeholder so students can see where to click to insert or change the key signature.
- Verification: `npm run build` passes after these changes, and the UI still preserves the existing two-click insert workflow and placeholder-rest behavior.


## 2026-04-15 Terminology and Key-Signature UX

- Scope: updated visible terminology and key-signature labelling without changing note-insertion logic, placeholder-rest behaviour, or measure-fit rules.
- Duration naming: the editor now surfaces Australian-first names such as Crotchet (Quarter Note), Minim (Half Note), Semibreve (Whole Note), Quaver (8th Note), and Semi-quaver (16th Note).
- Duration lookup fix: getDurationName() and the cursor-preview class lookup now resolve the exact dotted/non-dotted option instead of matching only the base duration. This removes incorrect labels for dotted minim / dotted crotchet selections and keeps the hover preview styling aligned.
- Key-signature metadata: App.tsx now carries a dedicated metadata map for every supported key signature, including the displayed accidental summary, the major/minor key names, and the picker tooltip text.
- Key-signature UX: score-front hotspots and popover buttons now surface the current key name and the full hover title, e.g. Set E Major / C# Minor key signature (4#).
- Visible copy: user-facing Bar labels in the toolbar/sidebar/status panels were standardized to Measure/Measures to match the current top-level UI wording.
- Current limitation: changing the key signature still does not transpose existing notes automatically; the UI now states that explicitly when the user applies a new signature.
- Verification: `npm run build` passes after these changes.

## 2026-04-15 Key-Aware Pitch Logic and Transposition

- Scope: moved key signatures from mostly-display metadata into the active pitch logic used by rendering, playback, tie validation, and export.
- Rendering/playback: score.ts now resolves the effective pitch alter from explicit accidentals first, then embedded pitch spelling, then the current key signature. This same resolution path now feeds stave accidentals, pitch labels, preview notes, playback notes, and tie matching.
- Stored note model: note insertion still keeps the existing workflow and data shape (`pitches[]` plus optional `accidentals`), but notes without an explicit accidental are now interpreted through `keySignature` instead of always behaving as naturals.
- Key change UX: the key-signature popover now exposes a persistent `Transpose existing notes when changing key` checkbox.
- Rewrite-only mode: with the checkbox off, changing key respells the current notes for the new signature while preserving sounding pitch. This is useful for correcting the written key signature without moving the melody.
- Transpose mode: with the checkbox on, changing key applies a diatonic+chromatic interval derived from the source/target major roots, rewrites the stored note spelling for the destination key, and keeps playback/export aligned with the transposed result.
- Export alignment: both frontend `src/composer/io.ts` and backend `backend/musicxml.mjs` now emit MusicXML `<alter>` and `<accidental>` from the effective key-aware pitch, not just from the raw stored pitch token. Tie-stop detection in export also now compares effective sounding pitch.
- Important current behaviour: this is still a single global key signature for the whole score; mid-score key changes are not yet modelled as separate measure events.
- Verification: `frontend/composer` `npm run build` passes, and `node --check backend/musicxml.mjs` passes.

## 2026-04-15 Layout Simplification and Bar Wrapping

- Scope: simplified the main editor layout to keep the notation stage visually central instead of surrounding it with informational side panels.
- Sidebar removal: the visible `Selection Help`, `Status`, `Selection`, and `Score` cards are hidden from the active layout. The JSX still exists, but the workspace is now effectively score-first.
- Workspace centering: `App.css` now uses a centred single-stage workspace with a capped stage width (`max-width: 1120px`) so large monitors no longer stretch the score paper into an overly wide composition view.
- System width policy: short systems no longer expand to fill all available width. In both hotspot geometry and actual stave rendering, the system width multiplier is now clamped with `Math.min(1, target/raw)` so lines stay compact and centred.
- Wrapping policy: `buildSystems()` in `src/composer/score.ts` now enforces at most four bars per system and introduces a minimum compression ratio (`0.84`) before wrapping. This allows small automatic tightening but avoids the previous “one very wide line” behaviour.
- Visible terminology: the top toolbar tab now reads `Bars`, and the add/remove controls now read `+ Bar` and `- Bar`.
- Visual verification: local Playwright inspection confirmed the centred compact layout and the updated `Bars` toolbar wording after the change, in addition to `npm run build` passing.

## 2026-04-15 Wrapped-System Hover Stability

- Problem: after the new compact wrapping rules landed, hover-based note insertion could still mutate the line break. When the pointer entered a crowded wrapped bar, `placeholderFocus` fed back into `buildSystems()`, temporarily widened the focused group, and caused the affected bar to jump between the previous line and the next line.
- Fix: `buildSystems()` in `src/composer/score.ts` no longer depends on hover/placeholder focus or the currently selected note duration. System breaking is now based only on actual score content, meter, and available width.
- Remaining behaviour: hover focus still affects placeholder rendering inside the already chosen system via `buildStaffVoiceData()`, but it no longer participates in line-breaking decisions.
- Verification: `npm run build` passes, and a local Playwright hover check confirmed that score-front hotspot positions stay unchanged while moving the mouse across wrapped systems.

## 2026-04-15 System Right-Edge Alignment

- Problem: after compact centring was introduced, shorter wrapped systems (for example three-bar lines) no longer ended on the same right boundary as fuller four-bar systems. The page was compact, but the ragged right edge looked unfinished.
- Fix: `scoreWidth` in `src/App.tsx` now uses the fixed centred paper width again, and both hotspot layout plus actual stave rendering compute `widthMultiplier = targetSystemWidth / rawSystemWidth` so each system is justified to the same right edge inside that paper.
- Important nuance: this does not reintroduce the old “stretch to full browser width” problem because the workspace itself is still capped by the centred score-stage width from the previous layout simplification.
- Verification: `npm run build` passes, and local Playwright screenshots show aligned right edges while keeping the narrower centred page.

## 2026-04-15 Note Insertion Arming and Progressive Placeholder Rests

- Problem: note insertion still behaved like the older hover-first workflow. As soon as the pointer entered an empty rest area, placeholder rests expanded immediately, which was too eager for students and made the left-to-right fill order unclear for 16th/32nd entry.
- New interaction contract:
  - hover alone does not arm anything
  - first click arms the beat group
  - second click inserts the note
  - once armed, the preview is pinned to the left-most available slot in that beat group
- State-flow changes in `src/App.tsx`:
  - `handleScoreMouseMove()` no longer sets `placeholderFocus` or `hoveredRestPosition` for normal note-mode rest hover
  - `clearPendingInsertPreview()` now also clears `placeholderFocus`
  - arming is now driven by `armPendingInsertPreview()` / `armPendingInsertPreviewForPosition()`, which set both the pending preview and the focused placeholder group only after a click
  - post-insert auto-advance is now committed inside the `setMeasures()` updater result, not via an outer mutable local, because the earlier outer-local approach lost the next-slot state under React state scheduling
- Progressive rest logic:
  - added a recursive power-of-two placeholder planner around `buildStaffVoiceData()`
  - the planner keeps the right-hand side coarse until the left-hand side has been filled, which yields the teaching-friendly sequences:
    - 16th: `16 + 16 + 8`, then later `16 + 16`
    - 32nd: `32 + 32 + 16 + 8`, then `32 + 32 + 8`, then `32 + 32 + 16`, then `32 + 32`
  - fallback behaviour still exists for non power-of-two group/length combinations, so the change is scoped to the simple-meter cases that motivated it
- Preview positioning:
  - pending note preview X/Y is now derived from live hit-box geometry during render instead of being stored permanently in preview state
  - this keeps the blue preview aligned even after the inserted note changes spacing or causes a local re-render
- Validation done:
  - `npm run build` passes
  - local Playwright checks confirmed:
    - no preview before first click
    - first click arms the left-most slot in the chosen rest group
    - after inserting a 16th note, the next slot in the same group remains armed
    - after inserting a 32nd note, the next slot in the same group remains armed
