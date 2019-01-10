# Contribute to code
If you want to contribute make sure the commits are `verified`.   
You can read how to GPG sign you commits [here](https://help.github.com/articles/signing-commits-using-gpg/).


# Tools used
[Karma](https://karma-runner.github.io): JS test framework
[Bourbon](https://www.bourbon.io/): Sass->css framework
[Grunt](https://gruntjs.com/): Automation tool to compile/test/deploy

# Test
With Docker:
```
docker build . -t passman-dev && docker run -it --rm --user=`id -u` passman-dev grunt test
```

# Tips
Compile scss to scc: `grunt watch`