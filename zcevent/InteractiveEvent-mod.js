//===========================================================================
// 真实互动事件 - 定制版 (修改 testDistance 函数)
//-------––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
// 需要在 quxios 的 QMovement.js 脚本之后使用
// 
// 定制内容
// 1. 使用 QMovement 的碰撞盒
// 2. <press> 中添加一个 dir 参数过滤出现时机
//===========================================================================

/*:zh
 * @plugindesc 真实互动事件
 * @author hyrious
 *
 * @help
 *
 * 在事件备注栏添加备注 <真实互动事件>, 然后这个事件会做如下处理
 * 1. 玩家接近时显示「可用操作列表」, 具体定义见下方注释
 * 2. 玩家按下「可用操作」对应的按键, 触发对应事件页开始执行
 * 3. 如果没有可用操作列表, 退化到一般事件的处理机制
 *
 * 「可用操作列表」产生逻辑
 * 1. 事件备注栏要有 <真实互动事件> (包括 < 尖括号 > 符号)
 * 2. 去掉不满足执行条件的事件
 * 3. 剩下的事件中, 包含以下注释的事件页是「可用操作」
 *    1. <press: key icon_id text style_id dir>
 *       key      - 按键
 *       icon_id  - 按键图标
 *       text     - 操作文本, 不能有空格
 *       style_id - 文本样式
 *       dir      - [2,4,6,8], 不能有空格, 在碰撞后检测主角方向, 此参数可选,
 *                  2 下, 4 左, 6 右, 8 上
 *    2. <name: text style_id>
 *       text     - 当该页出现在最右侧且有效时, 可用操作列表的标题, 不能有空格
 *       style_id - 标题文本样式
 * 4. 若 3 中找不到任何「可用操作」, 退化到普通事件的处理
 */

void (function() {

    // 文本样式配置项
    var Styles = {
        // 编号: [字体, 字号, 颜色, 描边颜色, offsetX, offsetY]
        1: ["黑体", 20, "#ff0000", "#00ff00", 0, 0],
    };

    // 距离角色多近 (格数) 就显示可用操作
    var Distance = 1;

    // 高级: 自定义距离判定方式 (覆盖 Distance 配置)
    function testDistance(event, player) {
        // 飞行时禁用
        if (player._characterName === "$Actor1_2") {
            return false;
        }
        // 碰撞盒检测
        var dist = 3;
        var type = 'interaction';
        var dirs = [2, 4, 6, 8];
        var result = false;
        for (var i in dirs) {
            var dir = dirs[i];
            var x1 = $gameMap.roundPXWithDirection(player._px, dir, dist);
            var y1 = $gameMap.roundPYWithDirection(player._py, dir, dist);
            player.collider(type).moveTo(x1, y1);
            if (player.collidedWithCharacter(type, event)) {
                result = true;
                break;
            }
        }
        player.collider(type).moveTo(player._px, player._py);
        return result;
    }

    // 参考 Input.keyMapper, <press> 中声明的按键会使用
    // 右侧对应的参数传给 Input.isTriggered
    var KeyMapper = {
        Q: "pageup",
        W: "pagedown",
        X: "escape",
        Z: "ok",
    };

    // 高亮颜色
    var BlendColor = [255, 255, 255, 128];

    //-----------------------------------------------------------------------

    var _initEventMembers = Game_Event.prototype.initMembers;
    Game_Event.prototype.initMembers = function() {
        _initEventMembers.call(this);
        this._interactiveEventPageIndex = -1;
        this._needsRefreshActions = true;
        this._emitRefreshActionsToSprite = false;
        this._lastPlayerDirection = 0;
    };

    Game_Event.prototype.isInteractiveEvent = function() {
        var event = this.event();
        return event && event.note.includes("<真实互动事件>");
    };

    Game_Event.prototype.requestRefreshActions = function() {
        this._needsRefreshActions = true;
    };

    var _refreshEvent = Game_Event.prototype.refresh;
    Game_Event.prototype.refresh = function() {
        _refreshEvent.call(this);
        this._needsRefreshActions = true;
    };

    // "[2]" -> [2]
    function parseArray(str) {
        if (!str) return null;
        return eval(str);
    }

    Game_Event.prototype.refreshInteractiveActions = function() {
        var actions = [];
        var pages = this.event().pages;
        for (var i in pages) {
            var page = pages[i];
            // 1. 去掉不满足执行条件的事件页
            if (!page || !this.meetsConditions(page)) continue;
            // 2. 扫描 <name>, <press>
            var action = { pageIndex: parseInt(i) };
            var list = page.list;
            for (var j in list) {
                var command = list[j];
                if (command.code === 108 || command.code === 408) {
                    var comment = command.parameters[0];
                    var matchName = comment.match(/<name:\s*(\S+)\s+(\d+)>/);
                    if (matchName) {
                        action.name = matchName[1];
                        action.nameStyle = parseInt(matchName[2]);
                    }
                    var matchPress = comment.match(/<press:\s*(\S+)\s+(\d+)\s+(\S+)\s+(\d+)(?:\s+(\S+))?>/);
                    if (matchPress) {
                        action.press = matchPress[1];
                        action.pressIcon = parseInt(matchPress[2]);
                        action.pressText = matchPress[3];
                        action.pressStyle = parseInt(matchPress[4]);
                        action.pressDir = parseArray(matchPress[5]);
                    }
                }
            }
            // 3. 定制内容: 考虑角色方向
            if (action.pressDir) {
                if (!action.pressDir.includes($gamePlayer.direction())) {
                    // 若方向不满足, 跳过此页
                    continue;
                }
            }
            if (action.press) {
                actions.push(action);
            } else {
                // 「清除事件页」, 没有 <press> 的事件页会清空之前的 actions
                actions = [];
            }
        }
        if (actions.length === 0) {
            this._cachedInteractiveEventActions = null;
        } else {
            this._cachedInteractiveEventActions = actions;
        }
        this._emitRefreshActionsToSprite = true;
    };

    Game_Event.prototype.updateInteractiveEventActions = function() {
        if (this._needsRefreshActions) {
            this._needsRefreshActions = false;
            this.refreshInteractiveActions();
        }
        if (testDistance(this, $gamePlayer)) {
            this._interactiveEventActions = this._cachedInteractiveEventActions;
        } else {
            this._interactiveEventActions = undefined;
        }
    };

    var _updateEvent = Game_Event.prototype.update;
    Game_Event.prototype.update = function() {
        _updateEvent.call(this);
        if (this.isInteractiveEvent()) {
            var direction = $gamePlayer.direction();
            if (direction !== this._lastPlayerDirection) {
                this._lastPlayerDirection = direction;
                this.requestRefreshActions();
            }
            this.updateInteractiveEventActions();
            if (this._interactiveEventActions) {
                for (var i in this._interactiveEventActions) {
                    var action = this._interactiveEventActions[i];
                    var key = KeyMapper[action.press] || action.press;
                    if (Input.isTriggered(key)) {
                        this._interactiveEventPageIndex = action.pageIndex;
                        this.start();
                        break;
                    }
                }
            }
        }
    };

    var _start = Game_Event.prototype.start;
    Game_Event.prototype.start = function() {
        if (this._interactiveEventActions && this._interactiveEventPageIndex < 0) {
            // 如果是真实互动事件, 此时按下 ok 没有对应的事件页响应, 那么也不应触发默认处理
            return;
        }
        _start.call(this);
    };

    var _page = Game_Event.prototype.page;
    Game_Event.prototype.page = function() {
        if (this._interactiveEventPageIndex >= 0) {
            return this.event().pages[this._interactiveEventPageIndex];
        } else {
            return _page.call(this);
        }
    };

    var _setup = Game_Interpreter.prototype.setup;
    Game_Interpreter.prototype.setup = function(list, eventId) {
        _setup.call(this, list, eventId);
        var event = $gameMap.event(eventId);
        if (event == null) return;
        if (event._interactiveEventPageIndex >= 0) {
            event._interactiveEventPageIndex = -1;
        }
    };

    var _initSpriteMembers = Sprite_Character.prototype.initMembers;
    Sprite_Character.prototype.initMembers = function() {
        _initSpriteMembers.call(this);
        this._isShowingInteractivePanel = false;
        if (this._interactiveEventPanel == null) {
            this._interactiveEventPanel = new Sprite();
            this._interactiveEventPanel.anchor.y = 1;
            this._interactiveEventPanel.opacity = 0;
            this.addChild(this._interactiveEventPanel);
        }
        this._interactiveEventPanelOffsetXY = [0, 0];
    };

    var helperBitmap = new Bitmap(0, 0);

    function applyStyle(style, bitmap) {
        bitmap = bitmap || helperBitmap;
        bitmap.fontFace = style[0];
        bitmap.fontSize = style[1];
        bitmap.textColor = style[2];
        bitmap.outlineColor = style[3];
    }

    function getNameIndex(actions) {
        var nameIndex = -1;
        for (var i in actions) {
            action = actions[i];
            if (action.name) {
                nameIndex = i;
            }
        }
        return nameIndex;
    }

    function calcWidth(actions, nameIndex) {
        var action;
        var width = 0;
        var maxWidth = 0;
        for (var i in actions) {
            action = actions[i];
            applyStyle(Styles[action.pressStyle]);
            width = helperBitmap.measureTextWidth(action.pressText) + 8;
            maxWidth = Math.max(maxWidth, width);
        }
        if ((action = actions[nameIndex])) {
            applyStyle(Styles[action.nameStyle]);
            width = helperBitmap.measureTextWidth(action.name) + 8;
            maxWidth = Math.max(maxWidth, width);
        }
        return maxWidth;
    }

    var AdditionalHeight = 16;

    function calcHeight(actions, nameIndex) {
        var action;
        var height = 0;
        var totalHeight = 0;
        for (var i in actions) {
            action = actions[i];
            height = Styles[action.pressStyle][1] + AdditionalHeight;
            totalHeight += height;
        }
        if ((action = actions[nameIndex])) {
            height = Styles[action.nameStyle][1] + AdditionalHeight;
            totalHeight += height;
        }
        return totalHeight;
    }

    Sprite_Character.prototype.refreshInteractiveEventPanel = function() {
        var actions = this._character._cachedInteractiveEventActions;
        if (actions == null) {
            this._interactiveEventPanel.bitmap = null;
            this._interactiveEventPanel.opacity = 0;
            return;
        }
        var nameIndex = getNameIndex(actions);
        var width = calcWidth(actions, nameIndex) + Window_Base._iconWidth + 16;
        var height = calcHeight(actions, nameIndex);
        var bitmap = new Bitmap(width, height);
        var y = 0;
        this._interactiveEventPanelOffsetXY = [0, 0];
        if (nameIndex >= 0) {
            var name = actions[nameIndex].name;
            var style = Styles[actions[nameIndex].nameStyle];
            applyStyle(style, bitmap);
            bitmap.drawText(name, 0, 0, width, style[1] + AdditionalHeight);
            y += style[1] + AdditionalHeight;
            this._interactiveEventPanelOffsetXY = [style[4], style[5]];
        }
        for (var i in actions) {
            var action = actions[i];
            var iconIndex = action.pressIcon;
            var text = action.pressText;
            var style = Styles[action.pressStyle];
            applyStyle(style, bitmap);
            // draw icon
            var iconset = ImageManager.loadSystem("IconSet");
            var pw = Window_Base._iconWidth;
            var ph = Window_Base._iconHeight;
            var sx = (iconIndex % 16) * pw;
            var sy = Math.floor(iconIndex / 16) * ph;
            bitmap.blt(iconset, sx, sy, pw, ph, 0, y + AdditionalHeight / 2);
            // draw text
            var h = style[1] + AdditionalHeight;
            bitmap.drawText(text, Window_Base._iconWidth + 8, y, width, h);
            y += h;
        }
        this._interactiveEventPanel.bitmap = bitmap;
    };

    Sprite_Character.prototype.updateInteractivePanel = function() {
        if (this._interactiveEventPanel.bitmap) {
            var isShow = this._character._interactiveEventActions != null;
            var offset = this._interactiveEventPanelOffsetXY;
            this._interactiveEventPanel.x = -this._frame.width / 2 + offset[0];
            this._interactiveEventPanel.y = -this._frame.height + offset[1];
            var blendColor = BlendColor.clone();
            var alpha = this.getBlendColor()[3];
            if (isShow) {
                this._interactiveEventPanel.opacity += 15;
                blendColor[3] = (alpha + 15).clamp(0, BlendColor[3]);
            } else {
                this._interactiveEventPanel.opacity -= 15;
                blendColor[3] = (alpha - 15).clamp(0, BlendColor[3]);
            }
            this.setBlendColor(blendColor);
        }
    };

    var _updateSprite = Sprite_Character.prototype.update;
    Sprite_Character.prototype.update = function() {
        _updateSprite.call(this);
        if (this._character._emitRefreshActionsToSprite) {
            this._character._emitRefreshActionsToSprite = false;
            this.refreshInteractiveEventPanel();
        }
        this.updateInteractivePanel();
    };

    var _setCharacter = Sprite_Character.prototype.setCharacter;
    Sprite_Character.prototype.setCharacter = function(character) {
        _setCharacter.call(this, character);
        if (character._cachedInteractiveEventActions) {
            this.refreshInteractiveEventPanel();
        }
    };

})();
