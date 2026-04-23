<?php

declare(strict_types=1);

use PHPUnit\Framework\TestCase;

final class PackageSmokeTest extends TestCase
{
	public function testRegistryPackageMetadataIsValid(): void
	{
		$root = dirname(__DIR__);
		$metadata_path = $root . '/.registry-package.json';
		$this->assertFileExists($metadata_path);

		$decoded = json_decode((string) file_get_contents($metadata_path), true);
		$this->assertIsArray($decoded);
		$this->assertSame('radaptor/themes/so-admin', $decoded['package'] ?? null);
		$this->assertSame('theme', $decoded['type'] ?? null);
		$this->assertSame('so-admin', $decoded['id'] ?? null);
		$this->assertSame('^0.1.0', $decoded['dependencies']['radaptor/core/cms'] ?? null);
	}

	public function testThemeEntrypointsExist(): void
	{
		$root = dirname(__DIR__);

		$this->assertFileExists($root . '/theme/_layout/template.layout_admin_default.php');
		$this->assertFileExists($root . '/theme/Cms/template._admin_dropdown.php');
		$this->assertDirectoryExists($root . '/public/assets/themes/so-admin');
	}
}
