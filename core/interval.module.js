(function() {
    var cancelOptionText, cancelPreviousText, cancelPreviousOptionText, timeoutSetupText, pauseSetupText, locationSetupText,
        zoomSetupText, incorrectInputText, taskSavedText, intervalFinishedText,
        allowedTimeouts, allowedPauses, timeoutMarkup, pauseMarkup, levelsMarkup,
        intervals;

    app.modules = app.modules || {};
    app.modules.interval = Interval;
    Interval.initMessage = '/interval';

    intervals = localStorage.getItem('interval__tasks');

    if (intervals) {
        intervals = JSON.parse(intervals);
    } else {
        intervals = [];
    }

    setInterval(function() {
        var lang,
            ts = new Date().getTime();

        intervals.forEach(function(task, k) {
            if (!task) {
                return;
            }

            if (task.nextPhotoAt <= ts) {
                (function(k) {
                    app.taskManager.add(task, function(result, error) {
                        // Remove interval after bot lost access to group
                        if (error === 'Error: Bad Request: Not in chat') {
                            delete(intervals[k]);
                            saveIntervals();
                        }
                    });
                }(k));

                task.nextPhotoAt = ts + task.pause;
            }

            if (task.shutdownTime <= ts) {
                lang = app.settings.lang(task.chat);

                app.telegram.sendMessage(task.chat, intervalFinishedText[lang] || intervalFinishedText.en, null);
                delete(intervals[k]);
            }
        });

        saveIntervals();
    }, 30000);


    function Interval(message) {
        this.chat = message.chat.id;
        this.lang = app.settings.lang(this.chat);
        this.hasTask = this.findActiveTask() > -1;
        this.timeout = null;
        this.pause = null;
        this.location = null;

        this.onMessage(message);
    }

    Interval.prototype.onMessage = function (message) {
        var zoom, temp,
            text = message.text,
            location = message.location;

        // Cancel action
        temp = cancelOptionText[this.lang] || cancelOptionText.en;
        if (text === temp) {
            this.complete = true;
            app.telegram.sendMessage(this.chat, '👍', null); // thumbs up
            return;
        }

        // Active task warning
        temp = cancelPreviousOptionText[this.lang] || cancelPreviousOptionText.en;
        if (this.hasTask && text === temp) {
            delete intervals[this.findActiveTask()];
            saveIntervals();

            this.hasTask = false;
            this.sendMessage('timeout');
            return;
        } else if (this.hasTask) {
            this.sendMessage('activeTask');
            return;
        }

        // Timeout setup
        if (!this.timeout && allowedTimeouts[text]) {
            this.timeout = allowedTimeouts[text];
            this.sendMessage('pause');
            return;
        } else if (!this.timeout) {
            this.sendMessage('timeout');
            return;
        }

        // Pause setup
        if (!this.pause && allowedPauses[text]) {
            this.pause = allowedPauses[text];
            this.sendMessage('location');
            return;
        } else if (!this.pause) {
            this.sendMessage('pause');
            return;
        }

        // Location setup
        if (!this.location && location && location.latitude && location.longitude) {
            this.location = location;
            this.sendMessage('zoom');
            return;
        } else if (!this.location) {
            this.sendMessage('location');
            return;
        }

        // Zoom setup
        zoom = parseInt(text);
        if (!this.zoom && zoom && zoom >= 3 && zoom <= 17) {
            this.zoom = zoom;
            this.complete = true;

            intervals.push({
                chat: this.chat,
                timeout: this.timeout,
                pause: this.pause,
                location: this.location,
                zoom: this.zoom,
                shutdownTime: new Date().getTime() + this.timeout,
                nextPhotoAt: new Date().getTime()
            });
            saveIntervals();

            this.sendMessage('complete');
        } else if (!this.zoom) {
            this.sendMessage('zoom');
        }
    };

    Interval.prototype.sendMessage = function(step) {
        var resp, markup;

        switch (step) {
            case 'activeTask':
                resp = cancelPreviousText[this.lang] || cancelPreviousText.en;
                markup = {
                    one_time_keyboard: true,
                    resize_keyboard: true,
                    keyboard: [
                        [cancelPreviousOptionText[this.lang] || cancelPreviousOptionText.en]
                    ]
                };
                break;

            case 'timeout':
                resp = timeoutSetupText[this.lang] || timeoutSetupText.en;
                markup = {
                    one_time_keyboard: true,
                    resize_keyboard: true,
                    keyboard: timeoutMarkup
                };
                break;

            case 'pause':
                resp = pauseSetupText[this.lang] || pauseSetupText.en;
                markup = {
                    one_time_keyboard: true,
                    resize_keyboard: true,
                    keyboard: pauseMarkup
                };
                break;

            case 'location':
                resp = locationSetupText[this.lang] || locationSetupText.en;
                markup = null;
                break;

            case 'zoom':
                resp = zoomSetupText[this.lang] || zoomSetupText.en;
                markup = {
                    one_time_keyboard: true,
                    resize_keyboard: true,
                    keyboard: levelsMarkup[this.lang] || levelsMarkup.en
                };
                break;

            case 'complete':
                resp = taskSavedText[this.lang] || taskSavedText.en;
                markup = null;
        }

        if (markup) {
            markup.keyboard = markup.keyboard.slice();
            markup.keyboard.push([cancelOptionText[this.lang] || cancelOptionText.en]);
        }
        app.telegram.sendMessage(this.chat, resp, markup);
    };


    // returns array index
    Interval.prototype.findActiveTask = function() {
        var result = -1,
            chat = this.chat;

        intervals.forEach(function(interval, i) {
            if (interval && interval.chat === chat) {
                result = i;
            }
        });

        return result;
    };

    function saveIntervals() {
        localStorage.setItem('interval__tasks', JSON.stringify(intervals));
    }

    allowedTimeouts = {
        '1 hour': 3600 * 1000,
        '2 hours': 2 * 3600 * 1000,
        '3 hours': 3 * 3600 * 1000,
        '6 hours': 6 * 3600 * 1000,
        '12 hours': 12 * 3600 * 1000,
        '24 hours': 86400 * 1000,
        '2 days': 2 * 86400 * 1000,
        '3 days': 3 * 86400 * 1000,
        '4 days': 4 * 86400 * 1000,
        '1 week': 7 * 86400 * 1000,
        '2 weeks': 14 * 86400 * 1000,
        '3 weeks': 21 * 86400 * 1000,
        '1 year': 365 * 86400 * 1000
    };

    allowedPauses = {
        '3 minutes': 3 * 60 * 1000,
        '5 minutes': 5 * 60 * 1000,
        '10 minutes': 10 * 60 * 1000,
        '15 minutes': 15 * 60 * 1000,
        '30 minutes': 30 * 60 * 1000,
        '60 minutes': 3600 * 1000,
        '2 hours': 2 * 3600 * 1000,
        '4 hours': 4 * 3600 * 1000,
        '6 hours': 6 * 3600 * 1000,
        '12 hours': 12 * 3600 * 1000,
        '24 hours': 24 * 3600 * 1000
    };

    timeoutMarkup = [
        ['1 hour', '2 hours', '3 hours'],
        ['6 hours', '12 hours', '24 hours'],
        ['2 days', '3 days', '4 days'],
        ['1 week', '2 weeks', '3 weeks'],
        ['1 year']
    ];

    pauseMarkup = [
        ['3 minutes', '5 minutes', '10 minutes'],
        ['15 minutes', '30 minutes', '60 minutes'],
        ['2 hours', '4 hours', '6 hours'],
        ['12 hours', '24 hours']
    ];

    levelsMarkup = {};
    levelsMarkup.en = [
        ['17 - All portals'],
        ['16', '15', '14', '13'],
        ['12', '10', '8', '6'],
        ['3 - World']
    ];
    levelsMarkup.ru = [
        ['17 - Все порталы'],
        ['16', '15', '14', '13'],
        ['12', '10', '8', '6'],
        ['3 - Весь мир']
    ];
    levelsMarkup.ua = [
        ['17 - Усі портали'],
        ['16', '15', '14', '13'],
        ['12', '10', '8', '6'],
        ['3 - Весь світ']
    ];

    // Translations
    cancelOptionText = {
        en: 'Cancel setup',
        ru: 'Отменить настройку',
        ua: 'Відмінити налаштування'
    };

    cancelPreviousText = {
        en: 'You already have interval task. You can cancel this task and create new one',
        ru: 'У вас уже есть активная задача. Вы должны отменить ее перед созданием новой',
        ua: 'У вас вже є активне завдання. Ви маєте відмінити її перед створенням нової'
    };

    cancelPreviousOptionText = {
        en: 'Cancel previous and create new',
        ru: 'Отменить задачу и создать новую',
        ua: 'Відмінити завдання та створити нову'
    };

    timeoutSetupText = {
        en: 'How long do you need interval?',
        ru: 'Как долго нужно создавать скриншоты?',
        ua: 'Протягом якого часу робити знімки?'
    };

    pauseSetupText = {
        en: 'How often do you need screenshots?',
        ru: 'Как часто присылать скриншоты?',
        ua: 'Як часто надсилати знімки?'
    };

    locationSetupText = {
        en: 'Send geolocation now',
        ru: 'Пришлите геолокацию нужной области',
        ua: 'Надішліть геолокацію необхідної області'
    };

    zoomSetupText = {
        en: 'Select zoom level',
        ru: 'Выберите масштаб карты',
        ua: 'Оберіть масштаб мапи'
    };

    incorrectInputText = {
        en: 'Incorrect input',
        ru: 'Неверный ввод. Выберите из предложенных вариантов',
        ua: 'Неправильне значення. Виберіть із запропонованих варіантів'
    };

    taskSavedText = {
        en: 'Task saved. You will start to receive screenshots soon',
        ru: 'Задача сохранена. Скоро вы начнете получать скриншоты',
        ua: 'Завдання збережено. Згодом Ви почнете отримувати знімки'
    };

    intervalFinishedText = {
        en: 'Interval complete. You will receive last screenshot in few minutes',
        ru: 'Интервал окончен. Через несколько минут вы получите последний скриншот',
        ua: 'Інтервал завершено. За декілька хвилин Ви отримаєте останній знімок'
    };
}());