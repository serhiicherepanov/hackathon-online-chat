import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./accordion";

describe("<AccordionTrigger />", () => {
  it("uses a right chevron while collapsed and rotates on open", () => {
    render(
      <Accordion type="single" collapsible>
        <AccordionItem value="section">
          <AccordionTrigger>Section</AccordionTrigger>
          <AccordionContent>Body</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

    const trigger = screen.getByRole("button", { name: "Section" });
    const icon = screen.getByTestId("accordion-chevron");

    expect(trigger.className).toContain("[&[data-state=open]>svg]:rotate-90");
    expect(trigger).toHaveAttribute("data-state", "closed");
    expect(icon).toHaveAttribute("data-direction", "right");

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("data-state", "open");
  });

  it("renders compact header actions outside toggle behavior", () => {
    const onAction = vi.fn();

    render(
      <Accordion type="single" collapsible>
        <AccordionItem value="section">
          <AccordionTrigger actions={<button onClick={onAction}>Action</button>}>
            Section
          </AccordionTrigger>
          <AccordionContent>Body</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

    const trigger = screen.getByRole("button", { name: "Section" });
    fireEvent.click(screen.getByRole("button", { name: "Action" }));

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(trigger).toHaveAttribute("data-state", "closed");
  });
});
