jQuery.fn.serializeObject = function()
{
    var o = {};
    var a = this.serializeArray();
    jQuery.each(a, function() {
        if (o[this.name] !== undefined) {
            if (!o[this.name].push) {
                o[this.name] = [o[this.name]];
            }
            var value = (this.value === 'on') ? true : this.value;
            value = (value === 'off') ? false : value;
            o[this.name].push(value || '');
        } else {
            var value = (this.value === 'on') ? true : this.value;
            value = (value === 'off') ? false : value;
            o[this.name] = value;
        }
    });
    return o;
};