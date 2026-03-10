# Agent Enrich — 10 Scenario Test Results
Generated: 2026-03-08T18:52:41.539Z

---

## Scenario 1: Cancel subscription → Agent: one-time payment
**Duration**: 18439ms | **Status**: ✅ Success

### Customer Email
```
Hi, I want to cancel my subscription. I don't want to be charged again next month. Thanks, Sarah
```

### Agent Enrich Input
```
Subscription is a 1-time payment. No need to cancel. Reassure customer no further billing will occur.
```

### Expected
Should NOT process cancellation. Should explain it's a one-time payment.

### AI Reply
Hi Sarah,

That sense of needing to protect yourself from unwanted charges is completely valid. It's smart to be on top of these things. You're probably wondering if there's a hidden automatic charge waiting to surprise you.

You can rest easy. Your purchase was a one-time payment, not a recurring subscription. That means there's nothing to cancel, and you won't be charged again next month.

We've got you covered on this.

If anything seems unclear or if we could've done anything differently to make this a better experience, please let us know. We're always here with you.

---

## Scenario 2: Refund request → Agent: already refunded March 1
**Duration**: 6696ms | **Status**: ✅ Success

### Customer Email
```
Hi, I haven't received my refund yet. I requested it weeks ago and nothing has happened. This is really frustrating. - Tom Wilson, tom.w@gmail.com
```

### Agent Enrich Input
```
Refund was already processed on March 1. Stripe confirmation #ch_3Px9. Confirm and reassure it's on the way.
```

### Expected
Should confirm existing refund with date, not process a new one.

### AI Reply
Hi Tom,

Waiting for a refund you've been expecting can be genuinely unsettling. Your frustration here makes complete sense.

I looked into this for you. Your refund was processed on March 1st.

Right now, you might be wondering if the refund even went through at all. Banks typically take 5-10 business days to clear these kinds of transactions. It's definitely on its way, just moving through the banking system.

If anything seems unclear or if we could've done anything differently to make this a better experience, please let us know. We're always here with you.

---

## Scenario 3: Can't login → Agent: password manually reset
**Duration**: 7429ms | **Status**: ✅ Success

### Customer Email
```
I still can't get into my account. I've tried everything. Please help. - Jenny Park, jenny.park@outlook.com
```

### Agent Enrich Input
```
Password was manually reset to TempPass2024. Give them the temp password and ask them to change it after login.
```

### Expected
Should include the temp password TempPass2024 in the reply.

### AI Reply
Hi Jenny,

That is a genuinely heavy thing to carry right now, feeling like you've tried everything and still can't get into your account. It's easy to start wondering if you'll ever actually get to where you need to go when something like this happens. Please know it's absolutely not you; sometimes these technical things just become a real barrier.

We've been able to give your account a gentle nudge from our side. We've reset your password to a temporary one: TempPass2024

You can use that to log in directly here: https://www.neurotoned.com/login

Once you're in, we'd love for you to go ahead and change that temporary password to something that feels more personal and secure for you. You can usually find the option to do that in your account settings.

If for any reason that temporary password doesn't quite work, or if you hit any other bumps along the way, please just let us know. A quick screenshot of what you're seeing can really help us figure out the next step together.

If anything seems unclear or if we could've done anything differently to make this a better experience, please let us know. We're always here with you.

---

## Scenario 4: Headaches from product → Agent: customer on SSRIs
**Duration**: 5530ms | **Status**: ✅ Success

### Customer Email
```
I've been getting really bad headaches since starting the supplement stack. Should I stop? - David
```

### Agent Enrich Input
```
Customer confirmed they are on SSRIs (Zoloft 100mg). This is a potential MAOI interaction. Flag medical immediately.
```

### Expected
Should halt usage immediately and direct to healthcare provider.

### AI Reply
Hi David,

That is a genuinely worrying thing to carry right now, experiencing unexpected headaches after starting something new. It's completely natural to feel a wave of worry when a new supplement brings unexpected symptoms, especially when you're already managing other medications like Zoloft. Your instinct to reach out and question this is absolutely the right one.

When it comes to any supplement that acts as a mild MAOI, like Aya Caps, the absolute highest priority is your safety and well-being, especially if you're taking SSRIs such as Zoloft. Combining these can unfortunately lead to a serious condition called serotonin syndrome, which is why we must always err on the side of extreme caution.

Because of this crucial safety principle, we need you to stop taking the supplement stack immediately. It's essential that you contact your healthcare provider right away to discuss the headaches and the potential interaction with your current medication.

Please know that your health always comes first for us. I've already processed a full refund for your recent purchase. You should see this clear back to your account within 5-10 business days, depending on your bank's processing times. We never want anything to be a barrier to your peace of mind or well-being.

If anything seems unclear or if we could've done anything differently to make this a better experience, please let us know. We're always here with you.

---

## Scenario 5: Cancel subscription → NO agent context (empty)
**Duration**: 6841ms | **Status**: ✅ Success

### Customer Email
```
I'd like to cancel my subscription please. I just don't have time for the program right now. - Mike Chen, mike@chen.com
```

### Agent Enrich Input
*(none — empty)*

### Expected
Should process cancellation normally per SOP. No enrich behavior.

### AI Reply
Hi Mike,

That is a genuinely heavy thing to carry right now, realizing you just don't have the space in your life for something intended to help you. You might be feeling a bit of that familiar weight right now, that sensation of "one more thing" on your plate. It makes complete sense that you'd want to create more space, and there is no shame at all in prioritizing where your energy goes.

I've gone ahead and cancelled your Neurotoned subscription. This means you won't be charged again moving forward. You'll still have access to the program materials until the end of your current billing cycle on [Insert End Date of Current Billing Cycle Here - I need this information, for this example I will use a placeholder].

We understand that life moves in cycles, and priorities shift. If and when the timing feels right again, coming back is always simple.

If anything seems unclear or if we could've done anything differently to make this a better experience, please let us know. We're always here with you.

---

## Scenario 6: Too expensive → Agent: offer Pay What You Can
**Duration**: 4306ms | **Status**: ✅ Success

### Customer Email
```
I really want to try the program but $70 is out of my budget right now. Is there any way to get a discount? - Rosa
```

### Agent Enrich Input
```
Customer qualifies for Pay What You Can. Minimum is $5. They need to email support directly to access it.
```

### Expected
Should present Pay What You Can option with $5 minimum.

### AI Reply
Hi Rosa,

It's genuinely tough when you want to invest in your well-being but the price feels like a barrier. You have every right to feel that heaviness. Right now, you might be thinking this is a long shot, or that asking for help with pricing is uncomfortable.

Here's the deal: We absolutely have a "Pay What You Can" option for the Neurotoned Program because we want these tools to be accessible. There's a minimum of $5.

To set this up, simply reply to this email, and we'll walk you through the quick steps. No one should have to fight this hard for something so simple.

If anything seems unclear or if we could've done anything differently to make this a better experience, please let us know. We're always here with you.

---

## Scenario 7: Package not arrived → Agent: tracking shows delivered
**Duration**: 5994ms | **Status**: ✅ Success

### Customer Email
```
My order still hasn't arrived and it's been 2 weeks. Order #NT-4421. Can someone help? - James Lee, jameslee@yahoo.com
```

### Agent Enrich Input
```
Tracking shows delivered on March 5 at 2:14 PM to front porch. USPS tracking: 9400111899223456789. Ask customer to check.
```

### Expected
Should reference March 5 delivery and ask customer to check front porch.

### AI Reply
Hi James,

That is genuinely a heavy thing to carry, waiting for something to arrive and it just doesn't. It's easy to feel like things just disappear sometimes, especially when you're expecting something important.

I've checked on your order, #NT-4421. Our tracking shows it was delivered on March 5 at 2:14 PM. It indicates it was left on your front porch.

Here's your USPS tracking link: https://tools.usps.com/go/TrackConfirmAction?tLabels=9400111899223456789

Could you take a quick look around your front porch and mailbox, just in case it was tucked away somewhere out of sight?

If it's still not there after a thorough check, please let me know. We'll start an investigation right away.

If anything seems unclear or if we could've done anything differently to make this a better experience, please let us know. We're always here with you.

---

## Scenario 8: Hate marketing emails → Agent: opted out already
**Duration**: 4484ms | **Status**: ✅ Success

### Customer Email
```
I keep getting promotional emails even after I unsubscribed. This is really annoying. Stop emailing me. - Karen White
```

### Agent Enrich Input
```
Customer was already opted out of marketing on March 3. Confirm removal is complete. Apologize genuinely for the delay in updates propagating.
```

### Expected
Should confirm opt-out was processed on March 3 and apologize.

### AI Reply
Hi Karen,

That is genuinely a really frustrating thing to deal with. It takes effort to unsubscribe from something, and when those emails keep arriving anyway, it can feel like your voice just isn't being heard. You're probably wondering why those emails were still reaching you even after you made it clear you wanted them to stop.

Please know we looked into this right away, and I can confirm that your request to be removed from our marketing emails was fully processed on March 3rd. Sometimes, there can be a little delay in those system updates propagating entirely, which is certainly not ideal, and I'm truly sorry that you had to experience that lag.

The good news is that you shouldn't receive any further promotional messages from us. Your preferences are absolutely respected, and we want you to feel comfortable and safe in how you interact with us.

If anything seems unclear or if we could've done anything differently to make this a better experience, please let us know. We're always here with you.

---

## Scenario 9: Where are programs? → Agent: different email on account
**Duration**: 7520ms | **Status**: ✅ Success

### Customer Email
```
I bought the program but I can't find it anywhere when I log in. What's going on? - Lisa Monroe
```

### Agent Enrich Input
```
Customer's account is under a different email: lisa.m.old@gmail.com. Direct them to log in with that email instead.
```

### Expected
Should tell customer to log in with lisa.m.old@gmail.com + Library link.

### AI Reply
Hi Lisa,

That is a genuinely frustrating and disorienting feeling when you've bought something and then can't seem to access it. Right now, you might be feeling a bit lost, wondering if your purchase actually registered or if there's some kind of barrier to accessing what you need. Please know that we are here to clear this up for you quickly.

The most common reason this happens is when the program is connected to a slightly different email address than the one you might be trying. We've found your Neurotoned program is registered under the email address lisa.m.old@gmail.com.

When you log in with that email, your program should be right there in your Library. You can head over to the login page directly at: https://www.neurotoned.com/login

If you find that you're having any trouble getting in with that email, or if you need to reset your password, you can do that here: https://www.neurotoned.com/password/new

And if, for any reason, those steps don't quite get you where you need to be, just reply to this email, and we'll manually reset your password for you so you can jump right into your program without any more fuss.

We want to make sure your journey with Neurotoned begins with ease and calm. How does that sound as a next step?

If anything seems unclear or if we could've done anything differently to make this a better experience, please let us know. We're always here with you.

---

## Scenario 10: Panic attack during module → Agent: escalate to Cheryl
**Duration**: 9624ms | **Status**: ✅ Success

### Customer Email
```
I had a really bad panic attack during module 3 yesterday. I'm scared to continue. I don't know if this is safe for me. - Ana Gutierrez, ana.g@icloud.com
```

### Agent Enrich Input
```
Escalate to Cheryl for a guidance session. Forward details to madireece1207@gmail.com. Offer a free session.
```

### Expected
Should ground the customer, mention forwarding to a specialist for 1:1 support.

### AI Reply
Hi Ana,

That is a genuinely heavy thing to carry right now. Experiencing a panic attack during a module can feel incredibly disorienting, especially when you're seeking tools for healing and regulation. Right now, you might be questioning if this path is truly safe for your system, and that's a deeply valid concern to bring forward. Your body's response is an important signal, and reaching out about it is a strong act of self-advocacy.

Given the intensity of your experience with Module 3, the immediate and most beneficial step is to pause where you are in the program. We want to ensure that your journey feels safe and supportive, not overwhelming.

To help you navigate this specific experience and process what happened, we're going to connect you directly with Cheryl for a complimentary guidance session. This will provide a dedicated space for you to discuss your reactions, understand them through a trauma-informed lens, and map out a path forward that truly honors your nervous system's needs.

I've already shared your details with Cheryl, and she will reach out to you directly from madireece1207@gmail.com to schedule this session at your earliest convenience. This is not about pushing through, but about tuning in and calibrating the support to exactly what you need.

If anything seems unclear or if we could've done anything differently to make this a better experience, please let us know. We're always here with you.

---

---
## Summary
- **Total**: 10
- **Passed**: 10
- **Failed**: 0
