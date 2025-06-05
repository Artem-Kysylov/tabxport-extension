          if (tableLines.length >= 2) {
            logger.debug(`Adding markdown table from code block in message ${containerIndex}`);
            // Mark as markdown table for special positioning (with error protection)
            // Temporarily disabled due to React conflicts
            /*
            try {
              htmlBlock.setAttribute('data-tabxport-table-type', 'markdown');
            } catch (error) {
              logger.warn('Could not set table type attribute on code block:', error);
            }
            */
            elements.push(htmlBlock);
            processedElements.add(htmlBlock);
          } 