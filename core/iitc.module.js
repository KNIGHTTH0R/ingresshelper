(function() {
    var helpText, statusText, enabledText, disabledText, pluginNotFoundText, completeText,
        plugins, markup;

    app.modules = app.modules || {};
    app.modules.iitc = IITC;

    IITC.initMessage = '/iitc';

    plugins = {
        'IITC': 'iitc/total-conversion-build.user.js',
        'Missions': 'iitc/missions.user.js',
        'Show portal weakness': 'iitc/show-portal-weakness.user.js',
        'Player tracker': 'iitc/player-tracker.user.js',
        'Portal names': 'iitc/portal-names.user.js',
        'Show the direction of links': 'iitc/link-show-direction.user.js',
        'Fix Google Map offset in China': 'iitc/fix-googlemap-china-offset.user.js'
    };

    function IITC(message) {
        var resp;

        this.chat = message.chat.id;
        this.lang = app.settings.lang(this.chat);

        markup = {
            one_time_keyboard: true,
            resize_keyboard: true,
            keyboard: this.buildKeyboard()
        };

        resp = helpText[this.lang] || helpText.en;
        resp += '\n\n';
        resp += this.getCurrentStatus();

        app.telegram.sendMessage(this.chat, resp, markup);
    }

    IITC.prototype.onMessage = function (message) {
        var index, isEnabled, url, resp, temp,
            text = message.text,
            enabled = app.settings.plugins(this.chat);

        temp = completeText[this.lang] || completeText.en;

        if (temp === text) {
            this.complete = true;
            app.telegram.sendMessage(this.chat, '👍', null); // thumbs up
        } else if (plugins[text]) {
            url = plugins[text];
            index = enabled.indexOf(url);
            isEnabled = index > -1;

            if (isEnabled) {
                if (text === 'IITC') {
                    enabled = [];
                } else {
                    enabled.splice(index, 1);
                }
            } else {
                if (enabled.length === 0 && url !== plugins.IITC) {
                    enabled.push(plugins.IITC);
                }

                enabled.push(url);
            }

            app.settings.plugins(this.chat, enabled);

            resp = this.getCurrentStatus();
            app.telegram.sendMessage(this.chat, resp, markup);

        } else {
            resp = pluginNotFoundText[this.lang] || pluginNotFoundText.en;
            app.telegram.sendMessage(this.chat, resp);
        }
    };

    IITC.prototype.getCurrentStatus = function() {
        var name, url, isEnabled,
            result = [],
            enabled = app.settings.plugins(this.chat);

        result.push(statusText[this.lang] || statusText.en);

        for (name in plugins) {
            if (!plugins.hasOwnProperty(name)) {
                continue;
            }

            url = plugins[name];
            isEnabled = enabled.indexOf(url) > -1;

            if (isEnabled) {
                result.push(name + ': ' + enabledText[this.lang] || enabledText.en);
            } else {
                result.push(name + ': ' + disabledText[this.lang] || disabledText.en);
            }
        }

        return result.join('\n');
    };

    IITC.prototype.buildKeyboard = function() {
        var name,
            result = [];

        for (name in plugins) {
            if (!plugins.hasOwnProperty(name)) {
                continue;
            }

            result.push([name]);
        }

        result.push([completeText[this.lang] || completeText.en]);

        return result;
    };

    // Translations
    helpText = {};
    helpText.en = 'You can setup IITC plugins from this menus';
    helpText.ru = 'Вы можете настроить плагины IITC из этого меню';

    statusText = {};
    statusText.en = 'Current status:';
    statusText.ru = 'Текущее состояние:';

    enabledText = {};
    enabledText.en = 'Plugin enabled';
    enabledText.ru = 'Плагин включен';

    disabledText = {};
    disabledText.en = 'Plugin disabled';
    disabledText.ru = 'Плагин отключен';

    pluginNotFoundText = {};
    pluginNotFoundText.en = 'Plugin not found';
    pluginNotFoundText.ru = 'Плагин не найден';

    completeText = {};
    completeText.en = 'Complete setup';
    completeText.ru = 'Завершить настройку';
}());