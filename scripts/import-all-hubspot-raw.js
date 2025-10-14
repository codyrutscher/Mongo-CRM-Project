const mongoose = require('mongoose');
const axios = require('axios');
const Contact = require('../src/models/Contact');

// Connect to MongoDB
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prospere-crm');

async function importAllHubSpotContactsRaw() {
  console.log('Starting raw HubSpot contact import...');
  
  const hubspotToken = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!hubspotToken) {
    throw new Error('HUBSPOT_ACCESS_TOKEN environment variable is required');
  }

  let after = undefined;
  let totalImported = 0;
  let batchNumber = 1;

  try {
    while (true) {
      console.log(`\nProcessing batch ${batchNumber}...`);
      
      // Get contacts from HubSpot with ALL properties
      const url = 'https://api.hubapi.com/crm/v3/objects/contacts';
      const params = {
        limit: 100,
        properties: 'email,firstname,lastname,phone,company,jobtitle,website,city,state,country,lifecyclestage,hubspot_owner_id,createdate,lastmodifieddate,hs_lead_status,hs_analytics_source,hs_analytics_source_data_1,hs_analytics_source_data_2,hs_latest_source,hs_latest_source_data_1,hs_latest_source_data_2,num_associated_deals,total_revenue,hs_time_to_move_from_lead_to_customer,days_to_close,hs_analytics_num_page_views,hs_analytics_num_visits,hs_analytics_num_event_completions,hs_email_optout,hs_legal_basis,gdpr_lawful_basis_for_processing_contact_data,hubspotscore,hs_persona,hs_buying_role,notes_last_contacted,notes_last_updated,notes_next_activity_date,num_notes,hs_sequences_enrolled_count,currentlyinworkflow,hs_time_in_lead,hs_time_in_subscriber,hs_time_in_customer,hs_time_in_opportunity,hs_time_in_other,hs_time_in_marketingqualifiedlead,hs_time_in_salesqualifiedlead,hs_time_in_evangelist,closedate,first_deal_created_date,recent_deal_amount,recent_deal_close_date,num_contacted_notes,num_conversion_events,first_conversion_date,first_conversion_event_name,recent_conversion_date,recent_conversion_event_name,hs_analytics_first_touch_converting_campaign,hs_analytics_last_touch_converting_campaign,hs_email_first_send_date,hs_email_last_send_date,hs_email_first_open_date,hs_email_last_open_date,hs_email_first_click_date,hs_email_last_click_date,hs_social_last_engagement,hs_social_twitter_clicks,hs_social_facebook_clicks,hs_social_linkedin_clicks,hs_social_google_plus_clicks,ip_city,ip_state,ip_country,ip_country_code,ip_latlon,ip_zipcode,ip_timezone,hs_ip_timezone,hs_language,kloutscoregeneral,twitterhandle,twitterprofilephoto,twitterbio,linkedinbio,blog_default_hubdb_table_id,hs_additional_emails,hs_all_owner_ids,hs_calculated_form_submissions,hs_calculated_merged_vids,hs_calculated_mobile_number,hs_calculated_phone_number,hs_calculated_phone_number_area_code,hs_calculated_phone_number_country_code,hs_calculated_phone_number_region_code,hs_email_domain,hs_merged_object_ids,hs_predictivecontactscore_v2,hs_predictivecontactscorebucket,hs_predictivescoringtier,hubspot_team_id,test_contact,hs_createdate,hubspot_owner_assigneddate,hs_email_first_reply_date,hs_email_last_reply_date,hs_email_replied,hs_marketable_status,hs_marketable_reason_id,hs_marketable_reason_type,hs_marketable_until_renewal,associatedcompanyid,associatedcompanylastupdated,hs_avatar_filemanager_key,hs_content_membership_email_confirmed,hs_content_membership_notes,hs_content_membership_registered_at,hs_content_membership_registration_domain_sent_to,hs_content_membership_registration_email_sent_at,hs_content_membership_status,hs_conversations_visitor_email,hs_count_is_unworked,hs_count_is_worked,hs_date_entered_customer,hs_date_entered_evangelist,hs_date_entered_lead,hs_date_entered_marketingqualifiedlead,hs_date_entered_opportunity,hs_date_entered_other,hs_date_entered_salesqualifiedlead,hs_date_entered_subscriber,hs_date_exited_customer,hs_date_exited_evangelist,hs_date_exited_lead,hs_date_exited_marketingqualifiedlead,hs_date_exited_opportunity,hs_date_exited_other,hs_date_exited_salesqualifiedlead,hs_date_exited_subscriber,hs_email_bad_address,hs_email_customer_quarantined_reason,hs_email_hard_bounce_reason,hs_email_hard_bounce_reason_enum,hs_email_quarantined,hs_email_quarantined_reason,hs_email_recipient_fatigue_recovery_time,hs_email_sends_since_last_engagement,hs_emailconfirmationstatus,hs_facebook_ad_clicked,hs_facebook_click_id,hs_feedback_last_nps_follow_up,hs_feedback_last_nps_rating,hs_feedback_last_survey_date,hs_feedback_show_nps_web_survey,hs_first_engagement_object_id,hs_google_click_id,hs_has_active_subscription,hs_latest_disqualified_lead_date,hs_latest_qualified_lead_date,hs_latest_sequence_ended_date,hs_latest_sequence_enrolled,hs_latest_sequence_enrolled_date,hs_latest_sequence_finished_date,hs_latest_sequence_unenrolled_date,hs_lifecyclestage_customer_date,hs_lifecyclestage_evangelist_date,hs_lifecyclestage_lead_date,hs_lifecyclestage_marketingqualifiedlead_date,hs_lifecyclestage_opportunity_date,hs_lifecyclestage_other_date,hs_lifecyclestage_salesqualifiedlead_date,hs_lifecyclestage_subscriber_date,hs_linkedin_ad_clicked,hs_linkedin_click_id,hs_object_id,hs_persona,hs_predictivecontactscore,hs_predictivecontactscore_v2_next_max_max_d4e58c1e,hs_predictivecontactscore_v2_next_max_max_d4e58c1e_date,hs_sales_email_last_clicked,hs_sales_email_last_opened,hs_sales_email_last_replied,hs_searchable_calculated_international_mobile_number,hs_searchable_calculated_international_phone_number,hs_searchable_calculated_mobile_number,hs_searchable_calculated_phone_number,hs_sequences_actively_enrolled_count,hs_sequences_enrolled_count,hs_testpurge,hs_testrollback,hs_timezone,hs_unique_creation_key,hs_updated_by_user_id,hs_user_ids_of_all_notification_followers,hs_user_ids_of_all_notification_unfollowers,hs_user_ids_of_all_owners,hs_was_imported,hs_whatsapp_phone_number,hubspot_owner_id,num_unique_conversion_events,recent_conversion_event_name,surveymonkeyeventlastupdated,webinareventlastupdated',
        ...(after && { after })
      };

      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${hubspotToken}`,
          'Content-Type': 'application/json'
        },
        params
      });

      const contacts = response.data.results;
      
      if (!contacts || contacts.length === 0) {
        console.log('No more contacts to process');
        break;
      }

      console.log(`Got ${contacts.length} contacts from HubSpot`);

      // Insert contacts as raw JSON
      for (const contact of contacts) {
        try {
          const newContact = new Contact({
            email: contact.properties.email || '',
            firstName: contact.properties.firstname || '',
            lastName: contact.properties.lastname || '',
            phone: contact.properties.phone || '',
            company: contact.properties.company || '',
            source: 'hubspot',
            sourceId: contact.id,
            // Store ALL HubSpot data in sourceMetadata
            sourceMetadata: {
              hubspotData: contact,
              hubspotId: contact.id
            },
            lastSyncedAt: new Date()
          });
          
          await newContact.save();
          totalImported++;
        } catch (error) {
          console.error(`Error importing contact ${contact.id}:`, error.message);
        }
      }

      console.log(`Imported ${contacts.length} contacts. Total: ${totalImported}`);

      // Check for next page
      if (response.data.paging && response.data.paging.next) {
        after = response.data.paging.next.after;
        batchNumber++;
      } else {
        break;
      }

      // Small delay to be nice to the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n✅ Import complete! Total contacts imported: ${totalImported}`);

  } catch (error) {
    console.error('Error during import:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

// Run the import
importAllHubSpotContactsRaw()
  .then(() => {
    console.log('Raw import finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Import failed:', error);
    process.exit(1);
  });