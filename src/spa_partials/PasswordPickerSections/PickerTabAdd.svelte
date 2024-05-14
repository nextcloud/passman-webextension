<script lang="ts">

</script>

<div class="tab-add-content">
    <h2 title="save_site"></h2>
    <div class="rrow">
        <label title="label"></label>
        <input type="text" class="input" name="savepw-label" id="savepw-label"/>
    </div>
    <div class="rrow">
        <label title="username"></label>
        <input type="text" class="input" name="savepw-username" id="savepw-username"/>
    </div>
    <div class="rrow">
        <label title="password"></label>

        <input type="password" class="input" name="savepw-password" id="savepw-password"/>
        <span class="niceInputButtons">
                       <div class="cell renewpw_newac" title="[generate_password, title]">
                           <i class="fa fa-refresh"></i>
                       </div>
                       <div class="cell togglePw" title="[toggle_visibility, placeholder]">
                           <i class="fa fa-eye-slash"></i>
                       </div>
                   </span>
    </div>
    <div class="rrow">
        <label title="vault"></label>
        <select id="savepw-vault" class="input"></select>
    </div>
    <small title="add_hint"></small>
    <hr/>
    <button class="btn btn-success" id="savepw-save" title="save"></button>
    <button class="btn" id="savepw-cancel" title="cancel"></button>
</div>
