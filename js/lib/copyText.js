function copyText(text) {
    var txtToCopy = document.createElement('input');
    txtToCopy.style.left = '-300px';
    txtToCopy.style.position = 'absolute';
    txtToCopy.value = text;
    document.body.appendChild(txtToCopy);
    txtToCopy.select();
    document.execCommand('copy');
    txtToCopy.parentNode.removeChild(txtToCopy);
}