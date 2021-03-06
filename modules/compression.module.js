/**
 * @file Compression setup module
 * @author Artem Veikus artem@veikus.com
 * @version 2.5.0
 */
(function() {
    app.modules = app.modules || {};
    app.modules.compression = Compression;

    /**
     * @param message {object} Telegram message object
     * @constructor
     */
    function Compression(message) {
        var resp, markup;

        this.chat = message.chat.id;
        this.lang = app.settings.lang(this.chat);

        markup = {
            one_time_keyboard: false,
            resize_keyboard: true,
            keyboard: [
                [app.i18n(this.lang, 'compression', 'disable')],
                [app.i18n(this.lang, 'compression', 'enable')]
            ]
        };

        resp = app.i18n(this.lang, 'compression', 'welcome');
        app.telegram.sendMessage(this.chat, resp, markup);
    }

    /**
     * @static
     * @param message {object} Telegram message object
     * @returns {boolean}
     */
    Compression.initMessage = function(message) {
        var chat = message.chat.id,
            lang = app.settings.lang(chat),
            text = message.text && message.text.toLowerCase();

        return text === '/compression' || text === app.i18n(lang, 'common', 'compression').toLowerCase();
    };

    /**
     * @param message {object} Telegram message object
     */
    Compression.prototype.onMessage = function (message) {
        var resp, offOption, onOption,
            text = message.text;

        offOption = app.i18n(this.lang, 'compression', 'disable');
        onOption = app.i18n(this.lang, 'compression', 'enable');

        if (text === offOption) {
            app.settings.compression(this.chat, false);
            this.complete = true;
        } else if (text === onOption) {
            app.settings.compression(this.chat, true);
            this.complete = true;
        }

        if (this.complete) {
            resp = app.i18n(this.lang, 'compression', 'saved');
            app.telegram.sendMessage(this.chat, resp, app.getHomeMarkup(this.chat));
        } else {
            resp = app.i18n(this.lang, 'compression', 'wrong_input');
            app.telegram.sendMessage(this.chat, resp);
        }
    };

}());
