<?php assert(isset($this) && $this instanceof Template); ?>
<?php $this->registerLibrary(LibrariesSoAdmin::__ADMIN_SITE); ?>
<?php
$lang = (string)($this->props['lang'] ?? substr(Kernel::getLocale(), 0, 2));
$site_name = (string)($this->props['site_name'] ?? Config::APP_SITE_NAME->value());
$document_title = (string)($this->props['document_title'] ?? $site_name);
?>
<!DOCTYPE html>
<html lang="<?= e($lang) ?>">
<head>
	<meta charset="utf-8">
	<title><?= e($document_title) ?></title>
	<meta name="robots" content="NOINDEX, NOFOLLOW">
	<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
	<link rel="shortcut icon" href="/favicon.ico">
	<link rel="icon" href="/favicon.ico" type="image/x-icon">
	<meta name="viewport" content="width=device-width">
	<?= $this->getRenderer()->getLibraryDebugInfo(); ?>
	<?= $this->getRenderer()->getCss(); ?>
	<?= $this->getRenderer()->getJsTop(); ?>
	<?= $this->getRenderer()->getJs(); ?>
	<style>
		.admin-login-shell {
			box-sizing: border-box;
			min-height: 100vh;
			display: flex;
			align-items: center;
			justify-content: center;
			padding: 2rem 1rem;
		}

		.admin-login-content {
			width: 100%;
		}
	</style>
</head>
<body>
<?= $this->getRenderer()->fetchInnerHtml(); ?>
<div id="container">
	<div class="content">
		<div class="content-full">
			<main class="admin-login-shell">
				<div class="admin-login-content">
					<?= $this->fetchSlot('content'); ?>
				</div>
			</main>
		</div>
	</div>
</div>
<script type="text/javascript">
	renderSystemMessages();
</script>
<?= $this->fetchSlot('page_chrome'); ?>
<?= $this->getRenderer()->fetchClosingHtml(); ?>
</body>
</html>
