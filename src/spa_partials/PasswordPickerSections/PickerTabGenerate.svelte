<script lang="ts">

</script>

<div class="tab-generate-content">
    <h2 title="generate_password"></h2>
    <div class="pw-gen">
        <div class="input-group">
            <input type="password" id="generated_password"/>
            <span class="niceInputButtons">
                       <div class="cell renewpw" title="[generate_password, title]">
                           <i class="fa fa-refresh"></i>
                       </div>
                       <div class="cell togglePwVis" title="[toggle_visibility, placeholder]">
                           <i class="fa fa-eye-slash"></i>
                       </div>
                   </span>
        </div>
        <div class="btn btn-secondary usepwd" title="use_generated_password"></div>
    </div>
    <div class="password_settings">
        <div>
                        <span href="#" class="adv_opt"><i class="fa fa-angle-right"></i> <span
                                title="toggle_advanced"></span></span>
        </div>
        <div class="pw-setting-advanced" style="display: none">
            <form name="advancedSettings">
                <label class="pw-len">
                    <span class="label" title="pw_length"></span><br/>
                    <input type="number" name="length" min="1"/>

                </label>
                <label class="pull-left clearfix">
                    <input type="checkbox"
                           id="upper"
                           name="useUppercase"/>
                    <span class="label sm">A-Z</span>
                </label>
                <label class="pull-left">
                    <input
                            name="useLowercase" type="checkbox"
                            id="lower"/>
                    <span class="label sm">a-z</span>
                </label>
                <label class="pull-left">
                    <input name="useDigits" type="checkbox"
                           id="digits"/>
                    <span class="label sm">0-9</span>
                </label>
                <label class="pull-left">
                    <input type="checkbox" id="special"
                           name="useSpecialChars"/>
                    <span class="label sm">1$%@#</span>
                </label>
                <label class="pull-left digits clearfix">
                    <span class="label" title="min_digits"></span><br/>
                    <input type="number" name="minimumDigitCount" min="0"/>
                </label>
                <label class="pull-left clearfix">
                    <input type="checkbox" id="ambig"
                           name="avoidAmbiguousCharacters"/>
                    <span class="label sm" title="avoid_ambiguous"></span>
                </label>

                <label class="pull-left clearfix">
                    <input type="checkbox" name="requireEveryCharType"
                           id="reqevery"/>
                    <span class="label sm" title="require_every_character_type"></span>
                </label>
            </form>
        </div>
    </div>

</div>
