<?php assert(isset($this) && $this instanceof Template); ?>
<?php
$phpinfoUrl = defined(WidgetList::class . '::PHPINFOFRAME')
	? widget_url((string) constant(WidgetList::class . '::PHPINFOFRAME'))
	: event_url('system.phpinfo');
?>
<ul class="admin-side-menu">
	<li class="menu-section"><?= e($this->strings['admin.menu.section.administration']) ?></li>
	<li>
		<a href="<?= widget_url(WidgetList::USERLIST); ?>">
			<i class="bi bi-people"></i>
			<?= e($this->strings['user.list.title']) ?>
		</a>
	</li>
	<?php if (defined(WidgetList::class . '::MCPTOKENS')): ?>
		<li>
			<a href="<?= widget_url((string) constant(WidgetList::class . '::MCPTOKENS')); ?>">
				<i class="bi bi-key"></i>
				<?= e($this->strings['admin.menu.mcp_tokens']) ?>
			</a>
		</li>
	<?php endif; ?>
	<?php if (Roles::hasRole(RoleList::ROLE_USERGROUPS_ADMIN)): ?>
		<li>
			<a href="<?= widget_url(WidgetList::USERGROUPLIST); ?>">
				<i class="bi bi-person-badge"></i>
				<?= e($this->strings['admin.menu.usergroups']) ?>
			</a>
		</li>
	<?php endif; ?>
	<?php if (Roles::hasRole(RoleList::ROLE_ROLES_ADMIN)): ?>
		<li>
			<a href="<?= widget_url(WidgetList::ROLELIST); ?>">
				<i class="bi bi-shield-check"></i>
				<?= e($this->strings['admin.menu.roles']) ?>
			</a>
		</li>
	<?php endif; ?>

	<?php if (Roles::hasRole(RoleList::ROLE_SYSTEM_ADMINISTRATOR)): ?>
		<li class="menu-section"><?= e($this->strings['admin.menu.section.configuration']) ?></li>
		<li>
			<a href="<?= widget_url(WidgetList::RESOURCETREE); ?>">
				<i class="bi bi-diagram-3"></i>
				<?= e($this->strings['admin.menu.resource_tree']) ?>
			</a>
		</li>
		<li>
			<a href="<?= widget_url('I18nWorkbench'); ?>">
				<i class="bi bi-translate"></i>
				<?= e($this->strings['admin.menu.translations']) ?>
			</a>
		</li>
		<li>
			<a href="<?= widget_url(WidgetList::IMPORTEXPORT); ?>">
				<i class="bi bi-arrow-down-up"></i>
				<?= e($this->strings['admin.menu.import_export']) ?>
			</a>
		</li>
	<?php endif; ?>

	<?php if (Roles::hasRole(RoleList::ROLE_SYSTEM_DEVELOPER)): ?>
		<?php if (!Roles::hasRole(RoleList::ROLE_SYSTEM_ADMINISTRATOR)): ?>
			<li class="menu-section"><?= e($this->strings['admin.menu.section.configuration']) ?></li>
		<?php endif; ?>
		<li>
			<a href="<?= widget_url(WidgetList::ADMINMENU); ?>">
				<i class="bi bi-list"></i>
				<?= e($this->strings['admin.menu.admin_menu']) ?>
			</a>
		</li>
		<li>
			<a href="<?= form_url(FormList::THEMESELECTOR, -1); ?>">
				<i class="bi bi-palette"></i>
				<?= e($this->strings['admin.menu.theme_selector']) ?>
			</a>
		</li>

		<li class="menu-section"><?= e($this->strings['admin.menu.section.developer_tools']) ?></li>
		<li>
			<a href="<?= widget_url(WidgetList::WIDGETPREVIEW); ?>">
				<i class="bi bi-puzzle"></i>
				<?= e($this->strings['admin.menu.widget_preview']) ?>
			</a>
		</li>
		<li>
			<a href="<?= $phpinfoUrl; ?>">
				<i class="bi bi-info-circle"></i>
				<?= e($this->strings['admin.menu.phpinfo']) ?>
			</a>
		</li>
		<?php if (defined(WidgetList::class . '::RUNTIMEDIAGNOSTICS')): ?>
			<li>
				<a href="<?= widget_url((string) constant(WidgetList::class . '::RUNTIMEDIAGNOSTICS')); ?>">
					<i class="bi bi-activity"></i>
					<?= e($this->strings['admin.menu.runtime_diagnostics'] ?? 'Runtime diagnostics') ?>
				</a>
			</li>
		<?php endif; ?>
		<li>
			<a href="/admin/developer/cli-runner.html">
				<i class="bi bi-terminal"></i>
				<?= e($this->strings['admin.menu.cli_runner']) ?>
			</a>
		</li>
	<?php endif; ?>
</ul>
