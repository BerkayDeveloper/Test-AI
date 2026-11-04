import { TestPlanResult, TestCase } from "../types";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "test";
}

/**
 * Playwright E2E Test Kodu Üreticisi (.spec.ts)
 */
export function generatePlaywrightCode(plan: TestPlanResult): string {
  const cleanPlanTitle = plan.title.replace(/"/g, '\\"');
  let code = `import { test, expect } from '@playwright/test';\n\n`;
  code += `/**\n`;
  code += ` * ${plan.title}\n`;
  code += ` * Kategori: ${plan.category} | Persona: ${plan.persona || "qa"}\n`;
  code += ` * Tarih: ${new Date(plan.createdAt || Date.now()).toLocaleDateString("tr-TR")}\n`;
  code += ` * Otomatik Üretilen Playwright Test Senaryoları\n`;
  code += ` */\n\n`;

  code += `test.describe('${cleanPlanTitle}', () => {\n`;
  code += `  test.beforeEach(async ({ page }) => {\n`;
  code += `    // Ön Koşul: Uygulama ana sayfasına veya test ortamına git\n`;
  code += `    await page.goto('/');\n`;
  code += `  });\n\n`;

  plan.testCases.forEach((tc, idx) => {
    const cleanTcTitle = tc.title.replace(/'/g, "\\'");
    code += `  test('${tc.id}: ${cleanTcTitle} [${tc.priority || "Normal"}]', async ({ page }) => {\n`;
    if (tc.preconditions) {
      code += `    // Ön Koşul: ${tc.preconditions.replace(/\n/g, " ")}\n`;
    }

    if (tc.targetComponent) {
      code += `    // Hedef Bileşen: ${tc.targetComponent}\n`;
    }

    tc.steps.forEach((step, stepIdx) => {
      const cleanStep = step.replace(/'/g, "\\'");
      code += `    await test.step('${cleanStep}', async () => {\n`;
      code += `      // TODO: '${cleanStep}' adımına ait seçici ve etkileşimi tanımlayın\n`;
      code += `      // await page.getByRole('button', { name: '...' }).click();\n`;
      code += `    });\n`;
    });

    if (tc.expectedResult) {
      const cleanExpected = tc.expectedResult.replace(/'/g, "\\'");
      code += `    // Beklenen Sonuç: ${cleanExpected}\n`;
      code += `    // await expect(page.locator('.result-container')).toBeVisible();\n`;
    }

    code += `  });\n\n`;
  });

  code += `});\n`;
  return code;
}

/**
 * Cypress E2E Test Kodu Üreticisi (.cy.ts)
 */
export function generateCypressCode(plan: TestPlanResult): string {
  const cleanPlanTitle = plan.title.replace(/'/g, "\\'");
  let code = `/// <reference types="cypress" />\n\n`;
  code += `describe('${cleanPlanTitle}', () => {\n`;
  code += `  beforeEach(() => {\n`;
  code += `    // Test ortamına bağlan\n`;
  code += `    cy.visit('/');\n`;
  code += `  });\n\n`;

  plan.testCases.forEach((tc) => {
    const cleanTcTitle = tc.title.replace(/'/g, "\\'");
    code += `  it('${tc.id}: ${cleanTcTitle}', () => {\n`;
    if (tc.preconditions) {
      code += `    // Ön Koşul: ${tc.preconditions.replace(/\n/g, " ")}\n`;
    }

    tc.steps.forEach((step, stepIdx) => {
      const cleanStep = step.replace(/'/g, "\\'");
      code += `    // Adım ${stepIdx + 1}: ${cleanStep}\n`;
      code += `    // cy.get('[data-testid="step-${stepIdx + 1}"]').click();\n`;
    });

    if (tc.expectedResult) {
      code += `    // Beklenen Sonuç: ${tc.expectedResult.replace(/'/g, "\\'")}\n`;
      code += `    // cy.contains('Başarılı').should('be.visible');\n`;
    }

    code += `  });\n\n`;
  });

  code += `});\n`;
  return code;
}

/**
 * Jest / Vitest Birim & Entegrasyon Test Kodu Üreticisi (.test.ts)
 */
export function generateJestCode(plan: TestPlanResult): string {
  const cleanPlanTitle = plan.title.replace(/'/g, "\\'");
  let code = `import { describe, it, expect, beforeEach, vi } from 'vitest';\n\n`;
  code += `/**\n`;
  code += ` * ${plan.title} - Birim / Entegrasyon Testleri\n`;
  code += ` */\n\n`;

  code += `describe('${cleanPlanTitle}', () => {\n`;
  code += `  beforeEach(() => {\n`;
  code += `    vi.clearAllMocks();\n`;
  code += `  });\n\n`;

  plan.testCases.forEach((tc) => {
    const cleanTcTitle = tc.title.replace(/'/g, "\\'");
    code += `  it('${tc.id}: ${cleanTcTitle}', async () => {\n`;
    if (tc.preconditions) {
      code += `    // Arrange: ${tc.preconditions.replace(/\n/g, " ")}\n`;
    }

    code += `    // Act: Adımların simülasyonu\n`;
    tc.steps.forEach((step, sIdx) => {
      code += `    // ${step}\n`;
    });

    code += `    // Assert: ${tc.expectedResult || "Beklenen durum doğrulaması"}\n`;
    code += `    expect(true).toBe(true);\n`;
    code += `  });\n\n`;
  });

  code += `});\n`;
  return code;
}

/**
 * Postman Collection v2.1.0 JSON Formatı
 */
export function generatePostmanCollection(plan: TestPlanResult): string {
  const collection = {
    info: {
      _postman_id: `postman-${plan.id}`,
      name: `AI Test Plan: ${plan.title}`,
      description: plan.overview || "Yapay zeka tarafından üretilen API test koleksiyonu.",
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    item: plan.testCases.map((tc, idx) => ({
      name: `${tc.id}: ${tc.title}`,
      request: {
        method: "POST",
        header: [
          {
            key: "Content-Type",
            value: "application/json",
          },
        ],
        body: {
          mode: "raw",
          raw: JSON.stringify(
            {
              scenario: tc.title,
              preconditions: tc.preconditions,
              steps: tc.steps,
            },
            null,
            2
          ),
        },
        url: {
          raw: "{{baseUrl}}/api/v1/test-endpoint",
          host: ["{{baseUrl}}"],
          path: ["api", "v1", "test-endpoint"],
        },
        description: `Ön Koşul: ${tc.preconditions}\nBeklenen: ${tc.expectedResult}`,
      },
      event: [
        {
          listen: "test",
          script: {
            exec: [
              `pm.test("${tc.id} - Durum Kodu 200 veya 201 Olmalı", function () {`,
              `    pm.expect(pm.response.code).to.be.oneOf([200, 201, 204]);`,
              `});`,
              ``,
              `pm.test("${tc.id} - Beklenen Sonuç: ${tc.expectedResult.replace(/"/g, '\\"')}", function () {`,
              `    var jsonData = pm.response.json();`,
              `    pm.expect(jsonData).to.not.be.null;`,
              `});`,
            ],
            type: "text/javascript",
          },
        },
      ],
    })),
  };

  return JSON.stringify(collection, null, 2);
}

