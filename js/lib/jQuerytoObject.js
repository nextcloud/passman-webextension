jQuery.fn.serializeObject = function()
{
    var o = {};
    var a = this.serializeArray();
    jQuery.each(a, function() {
        var value;
        if (o[this.name] !== undefined) {
            if (!o[this.name].push) {
                o[this.name] = [o[this.name]];
            }
            value = (this.value === 'on') ? true : this.value;
            value = (value === 'off') ? false : value;
            o[this.name].push(value || '');
        } else {
            value = (this.value === 'on') ? true : this.value;
            value = (value === 'off') ? false : value;
            o[this.name] = value;
        }
    });
    return o;
};