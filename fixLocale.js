var fs = require('fs');
var en = JSON.parse(fs.readFileSync('_locales/en/messages.json', 'utf8'));

var walkSync = function (dir, filelist) {
    var files = fs.readdirSync(dir);
    filelist = filelist || [];
    files.forEach(function (file) {
        if (fs.statSync(dir + file).isDirectory()) {
            filelist = walkSync(dir + file + '/', filelist);
        }
        else {
            filelist.push(dir + file);
        }
    });
    return filelist;
};

var language_files = [];
language_files = walkSync('_locales/', language_files);

for (var i = 0; i < language_files.length; i++) {
    var file = language_files[i];
    if(file == '_locales/en/messages.json'){
        continue;
    }
    var json_data = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (var translate_key in json_data) {
        if (en[translate_key] && !translate_key.hasOwnProperty('placeholders') && en[translate_key].hasOwnProperty('placeholders')) {
            console.log('Fixed ' + file + ' translate key: ' + translate_key);
            json_data[translate_key].placeholders = en[translate_key].placeholders;
        }
    }
    var options = { flag : 'w' };
    fs.writeFile(file, JSON.stringify(json_data, null, 4), function (err) {
        if(err){
           console.log('Error during saving');
        }
    });

}